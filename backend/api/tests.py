from decimal import Decimal
from unittest.mock import Mock, patch

from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Account, Cart, PromoCode, PromoCodeUsage, Watch


class PromoCodeApiTests(APITestCase):
    def setUp(self):
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
