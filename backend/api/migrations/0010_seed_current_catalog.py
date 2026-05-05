from decimal import Decimal

from django.conf import settings
from django.db import migrations


SELLERS = [
    {
        'username': 'dummy_user',
        'user_email': '',
        'account_email': 'dallax@example.com',
        'first_name': 'Dallax',
        'last_name': 'Leceña',
        'user_name': 'dallax_leceña',
    },
    {
        'username': 'kronos_admin',
        'user_email': 'kronos@example.com',
        'account_email': 'kronos@example.com',
        'first_name': 'Kronos',
        'last_name': 'Watches',
        'user_name': 'Kronos Watches',
    },
]


WATCHES = [
    {
        'seller_email': 'kronos@example.com',
        'brand': 'Rolex',
        'watch_name': 'Submariner',
        'condition': 'Excellent',
        'sale_price': '245000.00',
        'reference_number': '126610LN',
        'movement': 'Automatic',
        'case_material': 'Stainless Steel',
        'bracelet_material': 'Stainless Steel',
        'year_of_production': 2021,
        'gender': 'Unisex',
        'location': 'Geneva',
        'availability': 'Sold',
        'stock_quantity': 3,
        'currency': 'USD',
        'negotiable': False,
        'image': 'watches/Rolex_Submariner.png',
        'description': 'A timeless dive watch with a black dial and ceramic bezel.',
    },
    {
        'seller_email': 'kronos@example.com',
        'brand': 'Omega',
        'watch_name': 'Speedmaster Professional',
        'condition': 'Very Good',
        'sale_price': '155000.00',
        'reference_number': '311.30.42.30.01.005',
        'movement': 'Manual Wind',
        'case_material': 'Stainless Steel',
        'bracelet_material': 'Leather',
        'year_of_production': 2019,
        'gender': 'Unisex',
        'location': 'Bienne',
        'availability': 'Sold',
        'stock_quantity': 2,
        'currency': 'USD',
        'negotiable': False,
        'image': 'watches/Omega_Speedmaster.png',
        'description': 'The legendary Moonwatch with manual-wind chronograph movement.',
    },
    {
        'seller_email': 'kronos@example.com',
        'brand': 'Tudor',
        'watch_name': 'Black Bay Fifty-Eight',
        'condition': 'Excellent',
        'sale_price': '110000.00',
        'reference_number': '79030N',
        'movement': 'Automatic',
        'case_material': 'Stainless Steel',
        'bracelet_material': 'Leather',
        'year_of_production': 2022,
        'gender': 'Unisex',
        'location': 'Geneva',
        'availability': 'Available',
        'stock_quantity': 1,
        'currency': 'USD',
        'negotiable': True,
        'image': 'watches/Tudor_Blackbay.png',
        'description': 'A vintage-inspired dive watch with a sleek matte-black bezel.',
    },
    {
        'seller_email': 'kronos@example.com',
        'brand': 'Cartier',
        'watch_name': 'Santos-Dumont',
        'condition': 'Very Good',
        'sale_price': '165000.00',
        'reference_number': 'CRWSSA0007',
        'movement': 'Quartz',
        'case_material': 'Gold',
        'bracelet_material': 'Leather',
        'year_of_production': 2020,
        'gender': 'Men',
        'location': 'Paris',
        'availability': 'Available',
        'stock_quantity': 1,
        'currency': 'USD',
        'negotiable': False,
        'image': 'watches/Cartier_Dumont.png',
        'description': 'An elegant classic with a polished case and iconic square dial.',
    },
    {
        'seller_email': 'kronos@example.com',
        'brand': 'Patek Philippe',
        'watch_name': 'Nautilus',
        'condition': 'Excellent',
        'sale_price': '425000.00',
        'reference_number': '5711/1A',
        'movement': 'Automatic',
        'case_material': 'Stainless Steel',
        'bracelet_material': 'Stainless Steel',
        'year_of_production': 2023,
        'gender': 'Unisex',
        'location': 'Geneva',
        'availability': 'Available',
        'stock_quantity': 1,
        'currency': 'USD',
        'negotiable': False,
        'image': 'watches/Philippe_Nautilus.avif',
        'description': 'A legendary luxury sports watch with a distinctive porthole case and integrated bracelet.',
    },
    {
        'seller_email': 'dallax@example.com',
        'brand': 'Tissot',
        'watch_name': 'PRX',
        'condition': 'New',
        'sale_price': '24000.00',
        'reference_number': 'T137.407.11.041.00',
        'movement': None,
        'case_material': None,
        'bracelet_material': None,
        'year_of_production': 2026,
        'gender': 'Mens',
        'location': 'Quezon City, Philippines',
        'availability': 'Available',
        'stock_quantity': 1,
        'currency': 'PHP',
        'negotiable': False,
        'image': '',
        'description': None,
    },
]


PROMO_CODES = [
    {
        'code': '10FORALL',
        'discount_type': 'fixed',
        'discount_value': '1000.00',
        'usage_type': 'per_account',
        'max_uses': 1,
        'uses_count': 1,
        'max_uses_per_account': 1,
        'is_active': True,
        'expiry_date': None,
    },
]


def seed_current_catalog(apps, schema_editor):
    User = apps.get_model(settings.AUTH_USER_MODEL)
    Account = apps.get_model('api', 'Account')
    Watch = apps.get_model('api', 'Watch')
    PromoCode = apps.get_model('api', 'PromoCode')

    accounts_by_email = {}
    for seller in SELLERS:
        user, _ = User.objects.get_or_create(
            username=seller['username'],
            defaults={
                'email': seller['user_email'],
                'first_name': seller['first_name'],
                'last_name': seller['last_name'],
            },
        )

        account, _ = Account.objects.update_or_create(
            email=seller['account_email'],
            defaults={
                'user': user,
                'first_name': seller['first_name'],
                'last_name': seller['last_name'],
                'user_name': seller['user_name'],
            },
        )
        accounts_by_email[seller['account_email']] = account

    for watch_data in WATCHES:
        seller = accounts_by_email[watch_data['seller_email']]
        defaults = {
            key: value
            for key, value in watch_data.items()
            if key not in {'seller_email', 'reference_number', 'sale_price'}
        }
        defaults['sale_price'] = Decimal(watch_data['sale_price'])
        defaults['seller'] = seller

        Watch.objects.update_or_create(
            reference_number=watch_data['reference_number'],
            defaults=defaults,
        )

    for promo_data in PROMO_CODES:
        defaults = {
            key: value
            for key, value in promo_data.items()
            if key not in {'code', 'discount_value'}
        }
        defaults['discount_value'] = Decimal(promo_data['discount_value'])

        PromoCode.objects.update_or_create(
            code=promo_data['code'],
            defaults=defaults,
        )


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0009_normalize_watch_availability'),
    ]

    operations = [
        migrations.RunPython(seed_current_catalog, migrations.RunPython.noop),
    ]
