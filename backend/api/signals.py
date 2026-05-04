from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings
from .models import Watch, WatchMarketData
import requests

@receiver(post_save, sender=Watch)
def fetch_market_data(sender, instance, created, **kwargs):
    if not created:
        return  # Only fetch on new watches, not every save

    reference = instance.reference_number
    watch_name = instance.watch_name

    if not reference and not watch_name:
        return

    # Use reference number if available, otherwise watch name
    search_term = reference if reference else watch_name

    try:
        url = "https://watch-database1.p.rapidapi.com/watches/search"
        headers = {
            "x-rapidapi-key": settings.RAPIDAPI_KEY,
            "x-rapidapi-host": settings.RAPIDAPI_WATCH_HOST,
            "Content-Type": "application/json"
        }
        payload = {
            "searchTerm": search_term,
            "page": 1,
            "limit": 1
        }

        response = requests.post(url, json=payload, headers=headers)
        data = response.json()

        watches = data.get("watches", [])
        if not watches:
            # Try again with watch name if reference returned nothing
            if search_term != watch_name:
                payload["searchTerm"] = watch_name
                response = requests.post(url, json=payload, headers=headers)
                data = response.json()
                watches = data.get("watches", [])

        if watches:
            result = watches[0]
            WatchMarketData.objects.update_or_create(
                watch=instance,
                defaults={
                    "external_id": result.get("id"),
                    "market_price_eur": result.get("priceInEuro", ""),
                    "movement": result.get("movementName", ""),
                    "family_name": result.get("familyName", ""),
                    "year_produced": result.get("yearProducedName", ""),
                    "function_name": result.get("functionName", ""),
                    "limited": result.get("limitedName", ""),
                    "external_image": result.get("watchImageName", ""),
                }
            )

    except Exception as e:
        print(f"[WatchMarketData] Failed to fetch for '{watch_name}': {e}")