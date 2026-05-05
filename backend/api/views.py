from django.shortcuts import render
from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import api_view
from rest_framework.pagination import PageNumberPagination
from django.utils import timezone
from django.db.models import Q
from .models import Watch, Account, Order, Cart, PromoCode, PromoCodeUsage

CART_STORAGE = []
AVAILABLE_STATUS = "Available"

# --- UTILITY ---

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
        "seller_name": watch.seller.user_name if watch.seller else None,
        "description": watch.description,
        "image_url": request.build_absolute_uri(watch.image.url) if watch.image and request else None,
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
        "market_external_image": market.external_image if market else None,
    }

@api_view(['GET'])
def hello_api(request):
    return Response({"message": "Hello from Django backend"})

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

# --- PROMO CODE VIEWS ---

@api_view(['POST'])
def apply_promo_code(request):
    promo_code = request.data.get('promo_code', '').strip().upper()
    if not promo_code:
        return Response({'error': 'Promo code is required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        promo = PromoCode.objects.get(code=promo_code, is_active=True)
    except PromoCode.DoesNotExist:
        return Response({'error': 'Invalid or inactive promo code.'}, status=status.HTTP_400_BAD_REQUEST)

    if promo.expiry_date and promo.expiry_date < timezone.now():
        return Response({'error': 'Promo code has expired.'}, status=status.HTTP_400_BAD_REQUEST)

    if promo.max_uses is not None and promo.uses_count >= promo.max_uses:
        return Response({'error': 'Promo code has reached its usage limit.'}, status=status.HTTP_400_BAD_REQUEST)

    return Response({
        'code': promo.code,
        'discount_type': promo.discount_type,
        'discount_value': str(promo.discount_value),
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

        watches = Watch.objects.filter(carts__buyer=user)
        subtotal = sum(w.sale_price for w in watches)
        discount = 0.00

        promo_code_str = request.data.get('promo_code')
        if promo_code_str:
            try:
                promo = PromoCode.objects.get(code=promo_code_str.strip().upper(), is_active=True)
                usage, _ = PromoCodeUsage.objects.get_or_create(promo_code=promo, account=user)
                if usage.uses_count == 0:
                    discount = float(promo.discount_value)
                    usage.uses_count += 1
                    usage.save()
                    promo.uses_count += 1
                    promo.save()
                else:
                    return Response({'detail': 'Promo code already used'}, status=400)
            except PromoCode.DoesNotExist:
                return Response({'detail': 'Invalid promo code'}, status=400)

        total_price = float(subtotal) - discount

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
        order.watches.set(watches)
        watches.update(availability='Sold')
        cart.delete()

        return Response({
            'status': 'success',
            'order_id': order.order_id,
            'final_total': total_price,
            'discount_applied': discount
        }, status=status.HTTP_201_CREATED)

    except Account.DoesNotExist:
        return Response({'detail': 'User not found.'}, status=404)
    except Exception as e:
        return Response({'status': 'error', 'message': str(e)}, status=500)

@api_view(['GET'])
def view_orders(request, user_id):
    orders = Order.objects.filter(buyer_id=user_id)
    order_list = [{
        'order_id': o.order_id,
        'total_price': float(o.total_price),
        'payment_status': o.payment_status,
        'created_at': o.created_at,
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

        order = Order.objects.create(
            buyer=buyer_account,
            full_name=data.get('full_name'),
            payment_method=data.get('payment_method'),
            delivery_method=data.get('delivery_method'),
            total_price=data.get('total_price', 0.00),
            shipping_cost=data.get('shipping_cost', 100.00),
            payment_status=data.get('payment_status', 'pending'),
            shipping_address_line_1=data.get('shipping_address_line_1'),
            shipping_address_line_2=data.get('shipping_address_line_2', ''),
            shipping_city=data.get('shipping_city'),
            shipping_region=data.get('shipping_region'),
            shipping_zip_code=data.get('shipping_zip_code')
        )

        watch_ids = [wid for wid in (data.get('watches', []) or []) if wid is not None]
        if watch_ids:
            valid_watches = Watch.objects.filter(watch_id__in=watch_ids)
            order.watches.set(valid_watches)
            valid_watches.update(availability='Sold')

        return Response({
            "order_id": order.pk,
            "full_name": order.full_name,
            "total_price": str(order.total_price),
            "payment_status": order.payment_status,
            "delivery_method": order.delivery_method
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
