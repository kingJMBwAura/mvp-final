from django.db import migrations


def normalize_watch_availability(apps, schema_editor):
    Watch = apps.get_model('api', 'Watch')

    Watch.objects.filter(availability='In stock').update(availability='Available')
    Watch.objects.filter(availability='Available', stock_quantity=0).update(stock_quantity=1)


def restore_legacy_watch_availability(apps, schema_editor):
    Watch = apps.get_model('api', 'Watch')

    Watch.objects.filter(availability='Available').update(availability='In stock')


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0008_watchmarketdata'),
    ]

    operations = [
        migrations.RunPython(normalize_watch_availability, restore_legacy_watch_availability),
    ]
