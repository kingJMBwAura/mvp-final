from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from . import views

urlpatterns = [
    path('', views.landing_page, name='root_landing'),
    
    path('hello/', views.hello_api, name="hello_api"),        
    path('landing/', views.landing_page, name="landing_page"),
    
    path('watches/', views.all_watches, name="all_watches"), 
    path('watches/<int:watch_id>/', views.product_detail, name='product_detail'),
    
    path('cart/', views.get_user_cart, name='get_cart'),
    path('cart/add/', views.addToCart, name='add_to_cart'),
    path('cart/remove/<int:cart_id>/', views.remove_from_cart, name='remove_from_cart'),
    path('promo/apply/', views.apply_promo_code, name='apply_promo_code'),

    path('checkout/<int:user_id>/', views.checkout, name="checkout"),
        
    path('orders/create/', views.create_order, name='create_order'),
    path('orders/<int:id>/', views.get_order_by_id, name='get_order_by_id'),
]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)