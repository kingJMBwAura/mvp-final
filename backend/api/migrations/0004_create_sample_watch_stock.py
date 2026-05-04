from django.conf import settings
from django.db import migrations


def create_sample_watch_stock(apps, schema_editor):
    User = apps.get_model(settings.AUTH_USER_MODEL)
    Account = apps.get_model('api', 'Account')
    Watch = apps.get_model('api', 'Watch')

    default_user_data = {
        'email': 'kronos@example.com',
        'password': '',
    }

    user, _ = User.objects.get_or_create(
        username='kronos_admin',
        defaults=default_user_data,
    )

    Account.objects.get_or_create(
        user=user,
        defaults={
            'email': 'kronos@example.com',
            'first_name': 'Kronos',
            'last_name': 'Watches',
            'user_name': 'kronos',
        },
    )

    account = Account.objects.get(user=user)

    sample_watches = [
        {
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
            'availability': 'In stock',
            'currency': 'USD',
            'negotiable': False,
        },
        {
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
            'availability': 'Out of stock',
            'currency': 'USD',
            'negotiable': False,
        },
        {
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
            'availability': 'In stock',
            'currency': 'USD',
            'negotiable': True,
        },
        {
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
            'availability': 'Out of stock',
            'currency': 'USD',
            'negotiable': False,
        },
        {
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
            'availability': 'Out of stock',
            'currency': 'USD',
            'negotiable': False,
        },
    ]

    for watch_data in sample_watches:
        Watch.objects.get_or_create(
            reference_number=watch_data['reference_number'],
            defaults={**watch_data, 'seller': account},
        )


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0003_order_delivery_method_order_full_name_and_more'),
    ]

    operations = [
        migrations.RunPython(create_sample_watch_stock),
    ]
