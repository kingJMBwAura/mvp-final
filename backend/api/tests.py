from decimal import Decimal
from tempfile import TemporaryDirectory
from unittest.mock import Mock, patch

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from . import views
from .models import Account, Cart, PromoCode, PromoCodeUsage, Watch, WatchMarketData


class PromoCodeApiTests(APITestCase):
    def setUp(self):
        self.media_root = TemporaryDirectory()
        self.override_media = override_settings(MEDIA_ROOT=self.media_root.name)
        self.override_media.enable()
        self.addCleanup(self.override_media.disable)
        self.addCleanup(self.media_root.cleanup)

        self.market_data_request = patch('api.signals.requests.post')
        mocked_post = self.market_data_request.start()
        mocked_post.return_value = Mock(json=Mock(return_value={'watches': []}))
        self.addCleanup(self.market_data_request.stop)

        self.user = User.objects.create_user(username='buyer', password='password')
        self.account = Account.objects.create(
            user=self.user,
            email='buyer@example.com',
            first_name='Test',
            last_name='Buyer',
            user_name='buyer',
        )
        self.seller_user = User.objects.create_user(username='seller', password='password')
        self.seller = Account.objects.create(
            user=self.seller_user,
            email='seller@example.com',
            first_name='Test',
            last_name='Seller',
            user_name='seller',
        )
        self.watch = Watch.objects.create(
            brand='Omega',
            watch_name='Speedmaster',
            condition='Excellent',
            sale_price=Decimal('1000.00'),
            seller=self.seller,
            availability='Available',
            stock_quantity=1,
        )
        self.cart = Cart.objects.create(buyer=self.account)
        self.cart.items.add(self.watch)
        views.CART_STORAGE.clear()
        self.addCleanup(lambda: views.CART_STORAGE.clear())

    def test_apply_percentage_promo_returns_discounted_total(self):
        PromoCode.objects.create(
            code='SAVE10',
            discount_type='percentage',
            discount_value=Decimal('10.00'),
        )

        response = self.client.post('/api/promo/apply/', {
            'promo_code': 'save10',
            'account_id': self.account.pk,
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['discount_amount'], '100.00')
        self.assertEqual(response.data['total_after_discount'], '900.00')

    def test_checkout_applies_fixed_promo_and_records_usage(self):
        promo = PromoCode.objects.create(
            code='LESS100',
            discount_type='fixed',
            discount_value=Decimal('100.00'),
            usage_type='per_account',
            max_uses_per_account=1,
        )

        response = self.client.post(f'/api/checkout/{self.account.pk}/', {
            'promo_code': 'LESS100',
            'full_name': 'Test Buyer',
            'shipping_address_line_1': '123 Main',
            'shipping_city': 'Manila',
            'shipping_region': 'NCR',
            'shipping_zip_code': '1000',
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['final_total'], '900.00')
        self.assertEqual(response.data['discount_applied'], '100.00')
        usage = PromoCodeUsage.objects.get(promo_code=promo, account=self.account)
        self.assertEqual(usage.uses_count, 1)
        self.watch.refresh_from_db()
        self.assertEqual(self.watch.stock_quantity, 0)
        self.assertEqual(self.watch.availability, 'Sold')

    def test_create_order_applies_promo_from_frontend_payload(self):
        promo = PromoCode.objects.create(
            code='CART50',
            discount_type='fixed',
            discount_value=Decimal('50.00'),
            usage_type='per_account',
            max_uses_per_account=1,
        )

        response = self.client.post('/api/orders/create/', {
            'buyer': self.account.pk,
            'promo_code': 'CART50',
            'full_name': 'Test Buyer',
            'shipping_address_line_1': '123 Main',
            'shipping_city': 'Manila',
            'shipping_region': 'NCR',
            'shipping_zip_code': '1000',
            'shipping_cost': '100.00',
            'delivery_method': 'Standard',
            'payment_method': 'Credit Card',
            'watches': [self.watch.pk],
            'payment_status': 'pending',
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['total_price'], '1050.00')
        self.assertEqual(response.data['discount_applied'], '50.00')
        usage = PromoCodeUsage.objects.get(promo_code=promo, account=self.account)
        self.assertEqual(usage.uses_count, 1)

    def test_create_order_decrements_inventory_without_selling_remaining_stock(self):
        self.watch.stock_quantity = 2
        self.watch.save(update_fields=['stock_quantity'])

        response = self.client.post('/api/orders/create/', {
            'buyer': self.account.pk,
            'full_name': 'Test Buyer',
            'shipping_address_line_1': '123 Main',
            'shipping_city': 'Manila',
            'shipping_region': 'NCR',
            'shipping_zip_code': '1000',
            'shipping_cost': '100.00',
            'delivery_method': 'Standard',
            'payment_method': 'Credit Card',
            'watches': [self.watch.pk],
            'payment_status': 'pending',
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.watch.refresh_from_db()
        self.assertEqual(self.watch.stock_quantity, 1)
        self.assertEqual(self.watch.availability, 'Available')

    def test_create_order_clears_ordered_items_from_frontend_cart(self):
        views.CART_STORAGE.append({
            'id': 1,
            'watch': views.watch_to_dict(self.watch),
        })

        response = self.client.post('/api/orders/create/', {
            'buyer': self.account.pk,
            'full_name': 'Test Buyer',
            'shipping_address_line_1': '123 Main',
            'shipping_city': 'Manila',
            'shipping_region': 'NCR',
            'shipping_zip_code': '1000',
            'shipping_cost': '100.00',
            'delivery_method': 'Standard',
            'payment_method': 'Credit Card',
            'watches': [self.watch.pk],
            'payment_status': 'pending',
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        cart_response = self.client.get('/api/cart/')
        self.assertEqual(cart_response.status_code, status.HTTP_200_OK)
        self.assertEqual(cart_response.data['items'], [])
        self.assertEqual(cart_response.data['subtotal'], '0.00')

    def test_view_orders_returns_checked_out_watches(self):
        order_response = self.client.post('/api/orders/create/', {
            'buyer': self.account.pk,
            'full_name': 'Test Buyer',
            'shipping_address_line_1': '123 Main',
            'shipping_city': 'Manila',
            'shipping_region': 'NCR',
            'shipping_zip_code': '1000',
            'shipping_cost': '100.00',
            'delivery_method': 'Standard',
            'payment_method': 'Credit Card',
            'watches': [self.watch.pk],
            'payment_status': 'pending',
        }, format='json')

        self.assertEqual(order_response.status_code, status.HTTP_201_CREATED)

        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/orders/user/{self.account.pk}/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['orders']), 1)
        self.assertEqual(response.data['orders'][0]['order_id'], order_response.data['order_id'])
        self.assertEqual(response.data['orders'][0]['watches'][0]['id'], self.watch.pk)

    def test_view_orders_requires_login(self):
        response = self.client.get(f'/api/orders/user/{self.account.pk}/')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_order_rejects_out_of_stock_watch(self):
        self.watch.stock_quantity = 0
        self.watch.availability = 'Sold'
        self.watch.save(update_fields=['stock_quantity', 'availability'])

        response = self.client.post('/api/orders/create/', {
            'buyer': self.account.pk,
            'full_name': 'Test Buyer',
            'shipping_address_line_1': '123 Main',
            'shipping_city': 'Manila',
            'shipping_region': 'NCR',
            'shipping_zip_code': '1000',
            'shipping_cost': '100.00',
            'delivery_method': 'Standard',
            'payment_method': 'Credit Card',
            'watches': [self.watch.pk],
            'payment_status': 'pending',
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('no longer available', response.data['error'])

    def test_create_watch_listing_waits_for_admin_approval_before_shop_feed(self):
        response = self.client.post('/api/watches/create/', {
            'seller_id': self.seller.pk,
            'brand': 'Rolex',
            'watch_name': 'Datejust',
            'reference_number': '126234',
            'condition': 'Excellent',
            'sale_price': '500000.00',
            'currency': 'PHP',
            'location': 'Manila, Philippines',
            'stock_quantity': 1,
            'negotiable': True,
            'description': 'Full set with box and papers.',
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created_watch_id = response.data['watch']['id']
        self.assertEqual(response.data['watch']['availability'], 'Pending Review')

        created_watch = Watch.objects.get(pk=created_watch_id)
        WatchMarketData.objects.create(
            watch=created_watch,
            external_image='https://example.com/datejust.jpg',
        )

        shop_response = self.client.get('/api/watches/')
        self.assertEqual(shop_response.status_code, status.HTTP_200_OK)
        self.assertFalse(any(watch['id'] == created_watch_id for watch in shop_response.data))

        admin_user = User.objects.create_superuser(username='admin', password='password')
        self.client.force_authenticate(user=admin_user)
        approve_response = self.client.post(f'/api/watches/{created_watch_id}/approve/')
        self.assertEqual(approve_response.status_code, status.HTTP_200_OK)

        shop_response = self.client.get('/api/watches/')
        self.assertEqual(shop_response.status_code, status.HTTP_200_OK)
        created_listing = next(
            watch for watch in shop_response.data
            if watch['id'] == created_watch_id
        )
        self.assertEqual(created_listing['availability'], 'Available')
        self.assertEqual(created_listing['image_url'], 'https://example.com/datejust.jpg')
        self.assertEqual(created_listing['seller_name'], 'Test Seller')

    def test_create_watch_listing_accepts_image_upload(self):
        upload = SimpleUploadedFile(
            'listing.jpg',
            b'fake image content',
            content_type='image/jpeg',
        )

        response = self.client.post('/api/watches/create/', {
            'seller_id': self.seller.pk,
            'brand': 'Tudor',
            'watch_name': 'Black Bay',
            'condition': 'Very Good',
            'sale_price': '180000.00',
            'location': 'Makati, Philippines',
            'image': upload,
        }, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('/media/watches/', response.data['watch']['image_url'])

    def test_superuser_can_reject_pending_listing_and_delete_it(self):
        listing = Watch.objects.create(
            brand='Cartier',
            watch_name='Santos',
            condition='Good',
            sale_price=Decimal('250000.00'),
            seller=self.seller,
            availability='Pending Review',
            stock_quantity=1,
        )

        admin_user = User.objects.create_superuser(username='reviewer', password='password')
        self.client.force_authenticate(user=admin_user)
        response = self.client.delete(f'/api/watches/{listing.pk}/reject/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(Watch.objects.filter(pk=listing.pk).exists())

    def test_non_admin_cannot_review_pending_listing(self):
        listing = Watch.objects.create(
            brand='Cartier',
            watch_name='Tank',
            condition='Good',
            sale_price=Decimal('200000.00'),
            seller=self.seller,
            availability='Pending Review',
            stock_quantity=1,
        )

        self.client.force_authenticate(user=self.user)
        response = self.client.post(f'/api/watches/{listing.pk}/approve/')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_signup_creates_user_account_and_logs_in(self):
        response = self.client.post('/api/auth/signup/', {
            'username': 'newbuyer',
            'email': 'newbuyer@example.com',
            'password': 'strong-pass-123',
            'first_name': 'New',
            'last_name': 'Buyer',
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['user']['username'], 'newbuyer')
        self.assertFalse(response.data['user']['is_admin'])
        self.assertTrue(Account.objects.filter(user_name='newbuyer').exists())

    def test_expired_promo_is_rejected(self):
        PromoCode.objects.create(
            code='OLD',
            discount_type='fixed',
            discount_value=Decimal('50.00'),
            expiry_date=timezone.now() - timezone.timedelta(days=1),
        )

        response = self.client.post('/api/promo/apply/', {
            'promo_code': 'OLD',
            'account_id': self.account.pk,
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['error'], 'Promo code has expired.')

    def test_restricted_promo_requires_allowed_account(self):
        PromoCode.objects.create(
            code='VIP',
            discount_type='fixed',
            discount_value=Decimal('50.00'),
            usage_type='restricted',
        )

        response = self.client.post('/api/promo/apply/', {
            'promo_code': 'VIP',
            'account_id': self.account.pk,
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['error'], 'Promo code is not available for this account.')

    def test_per_account_limit_is_enforced(self):
        promo = PromoCode.objects.create(
            code='ONCE',
            discount_type='fixed',
            discount_value=Decimal('25.00'),
            usage_type='per_account',
            max_uses_per_account=1,
        )
        PromoCodeUsage.objects.create(promo_code=promo, account=self.account, uses_count=1)

        response = self.client.post('/api/promo/apply/', {
            'promo_code': 'ONCE',
            'account_id': self.account.pk,
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['error'], 'Promo code usage limit reached for this account.')
