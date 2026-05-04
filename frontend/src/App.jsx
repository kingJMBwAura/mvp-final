import { Routes, Route } from "react-router";
import HomePage from "./pages/HomePage";
import WatchDetailPage from "./pages/WatchDetailPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import OrderConfirmationPage from "./pages/OrderConfirmationPage";
import ShopNow from "./pages/ShopNow";
import About from "./pages/About";
import SellPage from './pages/SellPage'; 

export default function App() {
  return (
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/sell" element={<SellPage />} />
        <Route path="/watches/:id" element={<WatchDetailPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/orders/:id" element={<OrderConfirmationPage />} />
        <Route path="/shopnow" element={<ShopNow />} />
        <Route path="/about" element={<About />} />
      </Routes>
  );
}