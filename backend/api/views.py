from decimal import Decimal

from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import api_view
from rest_framework.pagination import PageNumberPagination
from django.utils import timezone
from django.db import transaction
from django.db.models import Q
from .models import Watch, Account, Order, Cart, PromoCode, PromoCodeUsage

CART_STORAGE = []
AVAILABLE_STATUS = "Available"
PENDING_STATUS = "Pending Review"

# --- UTILITY ---

def calculate_promo_discount(promo, subtotal):
    subtotal = Decimal(str(subtotal))

    if promo.discount_type == 'percentage':
        discount = subtotal * (promo.discount_value / Decimal('100'))
    else:
        discount = promo.discount_value

    return min(discount.quantize(Decimal('0.01')), subtotal)


def validate_promo_code(code, account=None, subtotal=None):
    if not code:
        return None, None, 'Promo code is required.'

    try:
        promo = PromoCode.objects.get(code=code.strip().upper(), is_active=True)
    except PromoCode.DoesNotExist:
        return None, None, 'Invalid or inactive promo code.'

    if promo.expiry_date and promo.expiry_date <= timezone.now():
        return None, None, 'Promo code has expired.'

    if promo.usage_type == 'universal':
        if promo.max_uses is not None and promo.uses_count >= promo.max_uses:
            return None, None, 'Promo code has reached its usage limit.'

    if promo.usage_type in ('per_account', 'restricted') and account is None:
        return None, None, 'An account is required to use this promo code.'

    usage = None
    if account is not None:
        usage = PromoCodeUsage.objects.filter(promo_code=promo, account=account).first()

    if promo.usage_type == 'per_account':
        max_uses = promo.max_uses_per_account or 1
        if usage and usage.uses_count >= max_uses:
            return None, None, 'Promo code usage limit reached for this account.'

    if promo.usage_type == 'restricted':
        if not promo.allowed_accounts.filter(pk=account.pk).exists():
            return None, None, 'Promo code is not available for this account.'
        max_uses = promo.max_uses_per_account or 1
        if usage and usage.uses_count >= max_uses:
            return None, None, 'Promo code usage limit reached for this account.'

    discount = calculate_promo_discount(promo, subtotal or Decimal('0.00'))
    return promo, discount, None


def record_promo_usage(promo, account):
    usage, _ = PromoCodeUsage.objects.get_or_create(promo_code=promo, account=account)
    usage.uses_count += 1
    usage.save(update_fields=['uses_count', 'updated_at'])

    promo.uses_count += 1
    promo.save(update_fields=['uses_count', 'updated_at'])


def clear_ordered_cart_items(watch_ids):
    global CART_STORAGE
    ordered_watch_ids = {int(watch_id) for watch_id in watch_ids}

    def is_ordered_cart_item(item):
        try:
            return int(item.get('watch', {}).get('id')) in ordered_watch_ids
        except (TypeError, ValueError):
            return False

    CART_STORAGE = [
        item for item in CART_STORAGE
        if not is_ordered_cart_item(item)
    ]


def decrement_watch_inventory(watch_ids):
    unique_watch_ids = list(dict.fromkeys(watch_ids))
    watches = list(Watch.objects.select_for_update().filter(watch_id__in=unique_watch_ids))

    if len(watches) != len(unique_watch_ids):
        return None, 'One or more watches could not be found.'

    unavailable = [
        watch for watch in watches
        if watch.availability != AVAILABLE_STATUS or watch.stock_quantity <= 0
    ]
    if unavailable:
        names = ', '.join(f'{watch.brand} {watch.watch_name}' for watch in unavailable)
        return None, f'These watches are no longer available: {names}'

    for watch in watches:
        watch.stock_quantity -= 1
        if watch.stock_quantity <= 0:
            watch.stock_quantity = 0
            watch.availability = 'Sold'
        else:
            watch.availability = AVAILABLE_STATUS
        watch.save(update_fields=['stock_quantity', 'availability', 'updated_at'])

    return watches, None


def parse_money(value, default='0.00'):
    try:
        return Decimal(str(value if value is not None else default))
    except Exception:
        return Decimal(default)


def parse_optional_int(value):
    if value in (None, ''):
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def parse_bool(value):
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in ('1', 'true', 'yes', 'on')


def normalize_external_image_url(value):
    if not value:
        return None

    value = str(value).strip()
    if value.startswith(('http://', 'https://')):
        return value
    return None


def get_watch_image_url(watch, request=None):
    if watch.image and request:
        return request.build_absolute_uri(watch.image.url)

    market = getattr(watch, 'market_data', None)
    if market:
        return normalize_external_image_url(market.external_image)

    return None


def get_account_display_name(account):
    if not account:
        return None

    full_name = f"{account.first_name} {account.last_name}".strip()
    return full_name or account.user_name


def watch_to_dict(watch, request=None):
    market = getattr(watch, 'market_data', None)
    return {
        "id": watch.watch_id,
        "brand": watch.brand,
        "watch_name": watch.watch_name,
        "reference_number": watch.reference_number,
        "condition": watch.condition,
        "sale_price": str(watch.sale_price),
        "currency": watch.currency,
        "seller_name": get_account_display_name(watch.seller),
        "description": watch.description,
        "image_url": get_watch_image_url(watch, request),
        "availability": watch.availability,
        "movement": watch.movement,
        "case_material": watch.case_material,
        "bracelet_material": watch.bracelet_material,
        "year_of_production": watch.year_of_production,
        "gender": watch.gender,
        "location": watch.location,
        "negotiable": watch.negotiable,
        "stock_quantity": watch.stock_quantity,
        # Market data from API
        "market_price_eur": market.market_price_eur if market else None,
        "market_movement": market.movement if market else None,
        "market_family": market.family_name if market else None,
        "market_year_produced": market.year_produced if market else None,
        "market_function": market.function_name if market else None,
        "market_limited": market.limited if market else None,
        "market_external_image": normalize_external_image_url(market.external_image) if market else None,
    }


def account_to_dict(account):
    user = account.user
    return {
        "id": account.pk,
        "username": user.username,
        "email": account.email,
        "first_name": account.first_name,
        "last_name": account.last_name,
        "display_name": account.user_name,
        "is_admin": user.is_superuser,
    }


def get_or_create_account_for_user(user):
    account = Account.objects.filter(user=user).first()
    if account:
        return account

    first_name = user.first_name or user.username
    last_name = user.last_name or ""
    email = (user.email or f"{user.username}@kronos.local").strip().lower()

    account = Account.objects.filter(email__iexact=email).first()
    if account:
        account.user = user
        account.email = email
        account.first_name = account.first_name or first_name
        account.last_name = account.last_name or last_name
        account.user_name = account.user_name or user.username
        account.save(update_fields=[
            "user",
            "email",
            "first_name",
            "last_name",
            "user_name",
            "updated_at",
        ])
        return account

    return Account.objects.create(
        user=user,
        email=email,
        first_name=first_name,
        last_name=last_name,
        user_name=user.username,
    )


def require_superuser(request):
    if not request.user.is_authenticated:
        return Response({'error': 'Login is required.'}, status=status.HTTP_401_UNAUTHORIZED)
    if not request.user.is_superuser:
        return Response({'error': 'Admin access is required.'}, status=status.HTTP_403_FORBIDDEN)
    return None

@api_view(['GET'])
def hello_api(request):
    return Response({"message": "Hello from Django backend"})


@csrf_exempt
@api_view(['POST'])
def signup(request):
    data = request.data
    username = str(data.get('username', '')).strip()
    email = str(data.get('email', '')).strip().lower()
    password = str(data.get('password', ''))
    first_name = str(data.get('first_name', '')).strip()
    last_name = str(data.get('last_name', '')).strip()

    missing_fields = [
        field for field, value in {
            'username': username,
            'email': email,
            'password': password,
            'first_name': first_name,
            'last_name': last_name,
        }.items()
        if not value
    ]
    if missing_fields:
        return Response({
            'error': 'Missing required fields.',
            'fields': missing_fields,
        }, status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(username__iexact=username).exists():
        return Response({'error': 'Username is already taken.'}, status=status.HTTP_400_BAD_REQUEST)
    if User.objects.filter(email__iexact=email).exists() or Account.objects.filter(email__iexact=email).exists():
        return Response({'error': 'Email is already registered.'}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.create_user(
        username=username,
        email=email,
        password=password,
        first_name=first_name,
        last_name=last_name,
    )
    account = Account.objects.create(
        user=user,
        email=email,
        first_name=first_name,
        last_name=last_name,
        user_name=username,
    )
    login(request, user)

    return Response({
        'status': 'success',
        'user': account_to_dict(account),
    }, status=status.HTTP_201_CREATED)


@csrf_exempt
@api_view(['POST'])
def login_user(request):
    username = str(request.data.get('username', '')).strip()
    password = str(request.data.get('password', ''))

    user = authenticate(request, username=username, password=password)
    if user is None:
        return Response({'error': 'Invalid username or password.'}, status=status.HTTP_400_BAD_REQUEST)

    login(request, user)
    account = get_or_create_account_for_user(user)
    return Response({
        'status': 'success',
        'user': account_to_dict(account),
    })


@csrf_exempt
@api_view(['POST'])
def logout_user(request):
    logout(request)
    return Response({'status': 'success'})


@api_view(['GET'])
def current_user(request):
    if not request.user.is_authenticated:
        return Response({'user': None})
    account = get_or_create_account_for_user(request.user)
    return Response({'user': account_to_dict(account)})

class WatchPagination(PageNumberPagination):
    page_size = 12
    page_size_query_param = 'page_size'
    max_page_size = 100

# --- PRODUCT VIEWS ---

@api_view(['GET'])
def landing_page(request):
    available_watches = Watch.objects.filter(availability=AVAILABLE_STATUS).select_related('seller')
    total_sellers = Account.objects.count()

    return Response({
        'stats': {
            'total_watches': available_watches.count(),
            'total_sellers': total_sellers,
        },
        'featured_watches': [watch_to_dict(w, request) for w in available_watches[:4]]
    })

@api_view(['GET'])
def all_watches(request):
    try:
        watches = Watch.objects.filter(availability=AVAILABLE_STATUS).select_related('seller')
        search = request.query_params.get('search', '').strip()

        if search:
            watches = watches.filter(
                Q(brand__icontains=search) |
                Q(watch_name__icontains=search) |
                Q(reference_number__icontains=search) |
                Q(condition__icontains=search) |
                Q(movement__icontains=search) |
                Q(case_material__icontains=search) |
                Q(bracelet_material__icontains=search) |
                Q(location__icontains=search)
            )

        return Response([watch_to_dict(w, request) for w in watches])
    except Exception as e:
        return Response({'status': 'error', 'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def product_detail(request, watch_id):
    try:
        watch = Watch.objects.select_related('seller').get(watch_id=watch_id)
        if watch.availability != AVAILABLE_STATUS:
            return Response({'detail': 'Watch is no longer available.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(watch_to_dict(watch, request))
    except Watch.DoesNotExist:
        return Response({'detail': 'Watch not found.'}, status=status.HTTP_404_NOT_FOUND)


@csrf_exempt
@api_view(['POST'])
def create_watch_listing(request):
    data = request.data
    required_fields = ['brand', 'watch_name', 'condition', 'sale_price', 'location']
    missing_fields = [
        field for field in required_fields
        if not str(data.get(field, '')).strip()
    ]

    if missing_fields:
        return Response({
            'error': 'Missing required fields.',
            'fields': missing_fields,
        }, status=status.HTTP_400_BAD_REQUEST)

    if request.user.is_authenticated:
        seller = get_or_create_account_for_user(request.user)
    else:
        seller_id = data.get('seller_id') or data.get('seller') or data.get('user_id')
        seller = None
        if seller_id:
            seller = Account.objects.filter(pk=seller_id).first()
        if seller is None:
            seller = Account.objects.order_by('pk').first()
    if seller is None:
        return Response({
            'error': 'A seller account is required before listing a watch.',
        }, status=status.HTTP_400_BAD_REQUEST)

    sale_price = parse_money(data.get('sale_price'))
    if sale_price <= 0:
        return Response({
            'error': 'Sale price must be greater than zero.',
        }, status=status.HTTP_400_BAD_REQUEST)

    watch = Watch.objects.create(
        brand=str(data.get('brand', '')).strip(),
        watch_name=str(data.get('watch_name', '')).strip(),
        reference_number=str(data.get('reference_number', '')).strip() or None,
        condition=str(data.get('condition', '')).strip(),
        sale_price=sale_price,
        seller=seller,
        movement=str(data.get('movement', '')).strip() or None,
        case_material=str(data.get('case_material', '')).strip() or None,
        bracelet_material=str(data.get('bracelet_material', '')).strip() or None,
        year_of_production=parse_optional_int(data.get('year_of_production')),
        gender=str(data.get('gender', '')).strip() or None,
        location=str(data.get('location', '')).strip(),
        availability=PENDING_STATUS,
        stock_quantity=parse_optional_int(data.get('stock_quantity')) or 1,
        currency=str(data.get('currency', 'PHP')).strip() or 'PHP',
        negotiable=parse_bool(data.get('negotiable', False)),
        description=str(data.get('description', '')).strip() or None,
        image=request.FILES.get('image') if request.FILES else None,
    )

    watch = Watch.objects.select_related('seller').filter(pk=watch.pk).first()
    return Response({
        'status': 'success',
        'watch': watch_to_dict(watch, request),
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
def pending_watch_listings(request):
    permission_error = require_superuser(request)
    if permission_error:
        return permission_error

    watches = Watch.objects.filter(availability=PENDING_STATUS).select_related('seller').order_by('-created_at')
    return Response([watch_to_dict(w, request) for w in watches])


@csrf_exempt
@api_view(['POST'])
def approve_watch_listing(request, watch_id):
    permission_error = require_superuser(request)
    if permission_error:
        return permission_error

    try:
        watch = Watch.objects.select_related('seller').get(pk=watch_id, availability=PENDING_STATUS)
    except Watch.DoesNotExist:
        return Response({'error': 'Pending listing not found.'}, status=status.HTTP_404_NOT_FOUND)

    watch.availability = AVAILABLE_STATUS
    if watch.stock_quantity <= 0:
        watch.stock_quantity = 1
    watch.save(update_fields=['availability', 'stock_quantity', 'updated_at'])

    return Response({
        'status': 'success',
        'watch': watch_to_dict(watch, request),
    })


@csrf_exempt
@api_view(['DELETE'])
def reject_watch_listing(request, watch_id):
    permission_error = require_superuser(request)
    if permission_error:
        return permission_error

    try:
        watch = Watch.objects.get(pk=watch_id, availability=PENDING_STATUS)
    except Watch.DoesNotExist:
        return Response({'error': 'Pending listing not found.'}, status=status.HTTP_404_NOT_FOUND)

    watch.delete()
    return Response({'status': 'success', 'message': 'Listing rejected and deleted.'})

# --- PROMO CODE VIEWS ---

@api_view(['POST'])
def apply_promo_code(request):
    promo_code = request.data.get('promo_code', '').strip().upper()
    account = None
    account_id = request.data.get('account_id') or request.data.get('user_id')
    if account_id:
        try:
            account = Account.objects.get(pk=account_id)
        except Account.DoesNotExist:
            return Response({'error': 'Account not found.'}, status=status.HTTP_404_NOT_FOUND)

    subtotal = request.data.get('subtotal')
    if subtotal is None and account is not None:
        watches = Watch.objects.filter(carts__buyer=account).distinct()
        subtotal = sum(w.sale_price for w in watches)
    elif subtotal is None:
        subtotal = Decimal('0.00')
    else:
        subtotal = parse_money(subtotal)

    promo, discount, error = validate_promo_code(promo_code, account=account, subtotal=subtotal)
    if error:
        return Response({'error': error}, status=status.HTTP_400_BAD_REQUEST)

    subtotal = parse_money(subtotal)
    total = max(subtotal - discount, Decimal('0.00'))

    return Response({
        'code': promo.code,
        'discount_type': promo.discount_type,
        'discount_value': str(promo.discount_value),
        'discount_amount': str(discount),
        'subtotal': str(subtotal.quantize(Decimal('0.01'))),
        'total_after_discount': str(total.quantize(Decimal('0.01'))),
    })

# --- CART VIEWS ---

@api_view(['GET'])
def get_user_cart(request):
    subtotal_val = sum(
        float(item['watch']['sale_price'].replace(',', '')) * item.get('quantity', 1)
        for item in CART_STORAGE
    )
    shipping_val = 100.00
    total_val = subtotal_val + shipping_val

    return Response({
        "items": CART_STORAGE,
        "subtotal": f"{subtotal_val:,.2f}",
        "shipping": f"{shipping_val:,.2f}",
        "total": f"{total_val:,.2f}"
    })

@api_view(['POST'])
def addToCart(request):
    watch_id = request.data.get('watch_id')
    try:
        watch = Watch.objects.select_related('seller').get(watch_id=int(watch_id))
    except Watch.DoesNotExist:
        return Response({"error": "Watch not found."}, status=400)

    if watch.availability.strip().lower() != AVAILABLE_STATUS.lower():
        return Response({"error": "Watch listing is no longer available."}, status=400)

    if watch.stock_quantity is not None and watch.stock_quantity <= 0:
        return Response({"error": "Watch is out of stock."}, status=400)

    existing = next((item for item in CART_STORAGE if int(item["watch"]["id"]) == watch.watch_id), None)
    if existing:
        return Response({"error": "Item already in cart."}, status=400)

    CART_STORAGE.append({
        "id": len(CART_STORAGE) + 1,
        "watch": watch_to_dict(watch, request),
    })
    return Response({"status": "success"}, status=201)

@api_view(['DELETE'])
def remove_from_cart(request, cart_id):
    global CART_STORAGE
    CART_STORAGE = [item for item in CART_STORAGE if item['id'] != int(cart_id)]
    return Response({"status": "success", "message": "Item removed"})

# --- ORDER VIEWS ---

@api_view(['POST'])
def checkout(request, user_id):
    try:
        user = Account.objects.get(pk=user_id)
        cart = Cart.objects.filter(buyer=user).prefetch_related('items')

        if not cart.exists():
            return Response({'detail': 'Cart is empty'}, status=status.HTTP_400_BAD_REQUEST)

        watches = Watch.objects.filter(carts__buyer=user).distinct()
        watch_ids = list(watches.values_list('watch_id', flat=True))
        subtotal = sum(w.sale_price for w in watches)
        discount = Decimal('0.00')
        promo = None

        promo_code_str = request.data.get('promo_code')
        if promo_code_str:
            promo, discount, error = validate_promo_code(promo_code_str, account=user, subtotal=subtotal)
            if error:
                return Response({'detail': error}, status=status.HTTP_400_BAD_REQUEST)

        total_price = max(Decimal(str(subtotal)) - discount, Decimal('0.00'))

        with transaction.atomic():
            purchased_watches, inventory_error = decrement_watch_inventory(watch_ids)
            if inventory_error:
                return Response({'detail': inventory_error}, status=status.HTTP_400_BAD_REQUEST)

            order = Order.objects.create(
                buyer=user,
                full_name=request.data.get('full_name', ''),
                payment_method=request.data.get('payment_method', 'Credit Card'),
                delivery_method=request.data.get('delivery_method', 'Standard'),
                total_price=total_price,
                shipping_cost=request.data.get('shipping_cost', 0.00),
                payment_status='completed',
                shipping_address_line_1=request.data.get('shipping_address_line_1', ''),
                shipping_address_line_2=request.data.get('shipping_address_line_2', ''),
                shipping_city=request.data.get('shipping_city', ''),
                shipping_region=request.data.get('shipping_region', ''),
                shipping_zip_code=request.data.get('shipping_zip_code', ''),
            )
            order.watches.set(purchased_watches)
            if promo:
                record_promo_usage(promo, user)
            cart.delete()

        return Response({
            'status': 'success',
            'order_id': order.order_id,
            'subtotal': str(Decimal(str(subtotal)).quantize(Decimal('0.01'))),
            'final_total': str(total_price.quantize(Decimal('0.01'))),
            'discount_applied': str(discount),
            'promo_code': promo.code if promo else None,
        }, status=status.HTTP_201_CREATED)

    except Account.DoesNotExist:
        return Response({'detail': 'User not found.'}, status=404)
    except Exception as e:
        return Response({'status': 'error', 'message': str(e)}, status=500)

@api_view(['GET'])
def view_orders(request, user_id):
    if not request.user.is_authenticated:
        return Response({'detail': 'Authentication is required.'}, status=status.HTTP_401_UNAUTHORIZED)

    account = get_or_create_account_for_user(request.user)
    if account.pk != user_id:
        return Response({'detail': 'You can only view your own orders.'}, status=status.HTTP_403_FORBIDDEN)

    orders = Order.objects.filter(buyer_id=user_id).prefetch_related('watches').order_by('-created_at')
    order_list = [{
        'order_id': o.order_id,
        'full_name': o.full_name,
        'total_price': str(o.total_price),
        'delivery_method': o.delivery_method,
        'payment_status': o.payment_status,
        'created_at': o.created_at,
        'watches': [
            watch_to_dict(watch, request)
            for watch in o.watches.all()
        ],
    } for o in orders]
    return Response({'status': 'success', 'orders': order_list})

@api_view(['POST'])
def create_order(request):
    try:
        data = request.data
        buyer_id = data.get('buyer')
        try:
            buyer_account = Account.objects.get(pk=buyer_id)
        except Account.DoesNotExist:
            return Response({"error": f"Account with ID {buyer_id} does not exist."}, status=400)

        watch_ids = [wid for wid in (data.get('watches', []) or []) if wid is not None]
        valid_watches = Watch.objects.filter(watch_id__in=watch_ids) if watch_ids else Watch.objects.none()
        subtotal = sum(w.sale_price for w in valid_watches)
        shipping_cost = parse_money(data.get('shipping_cost'), default='100.00')
        total_price = parse_money(data.get('total_price'), default='0.00')
        discount = Decimal('0.00')
        promo = None

        promo_code_str = data.get('promo_code')
        if promo_code_str:
            promo, discount, error = validate_promo_code(promo_code_str, account=buyer_account, subtotal=subtotal)
            if error:
                return Response({"error": error}, status=status.HTTP_400_BAD_REQUEST)
            total_price = max(subtotal + shipping_cost - discount, Decimal('0.00'))

        with transaction.atomic():
            purchased_watches = []
            if watch_ids:
                purchased_watches, inventory_error = decrement_watch_inventory(watch_ids)
                if inventory_error:
                    return Response({"error": inventory_error}, status=status.HTTP_400_BAD_REQUEST)

            order = Order.objects.create(
                buyer=buyer_account,
                full_name=data.get('full_name'),
                payment_method=data.get('payment_method'),
                delivery_method=data.get('delivery_method'),
                total_price=total_price,
                shipping_cost=shipping_cost,
                payment_status=data.get('payment_status', 'pending'),
                shipping_address_line_1=data.get('shipping_address_line_1'),
                shipping_address_line_2=data.get('shipping_address_line_2', ''),
                shipping_city=data.get('shipping_city'),
                shipping_region=data.get('shipping_region'),
                shipping_zip_code=data.get('shipping_zip_code')
            )

            if watch_ids:
                order.watches.set(purchased_watches)
            if promo:
                record_promo_usage(promo, buyer_account)

        if watch_ids:
            clear_ordered_cart_items(watch_ids)

        return Response({
            "order_id": order.pk,
            "full_name": order.full_name,
            "total_price": str(order.total_price),
            "payment_status": order.payment_status,
            "delivery_method": order.delivery_method,
            "discount_applied": str(discount),
            "promo_code": promo.code if promo else None,
        }, status=201)

    except Exception as e:
        return Response({"error": str(e)}, status=400)

@api_view(['GET'])
def get_order_by_id(request, id):
    try:
        order = Order.objects.get(pk=id)
        return Response({
            "order_id": order.pk,
            "full_name": order.full_name,
            "total_price": str(order.total_price),
            "payment_status": order.payment_status,
            "delivery_method": order.delivery_method
        })
    except Order.DoesNotExist:
        return Response({"error": "Order not found."}, status=404)
