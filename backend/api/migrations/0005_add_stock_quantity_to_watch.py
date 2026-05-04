from django.db import migrations, models


def set_watch_stock(apps, schema_editor):
    Watch = apps.get_model('api', 'Watch')
    stock_updates = {
        '126610LN': 3,
        '311.30.42.30.01.005': 2,
        '79030N': 1,
        'CRWSSA0007': 1,
    }

    for reference, quantity in stock_updates.items():
        Watch.objects.filter(reference_number=reference).update(stock_quantity=quantity)


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0004_create_sample_watch_stock'),
    ]

    operations = [
        migrations.AddField(
            model_name='watch',
            name='stock_quantity',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.RunPython(set_watch_stock),
    ]
