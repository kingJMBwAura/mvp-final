import { Link } from "react-router";
import VerificationBadges from "./VerificationBadges";

export default function WatchCard({ watch }) {
  const image = watch.image_url || watch.market_external_image;
  const model = watch.model ?? watch.watch_name ?? "";
  const price = watch.price ?? watch.sale_price ?? "";

  return (
    <div className="watch-card">
      {image && <img src={image} alt={`${watch.brand} ${model}`} />}
      <h3>{watch.brand} {model}</h3>
      <p>{watch.condition}</p>
      <p>₱{price}</p>
      <p>Seller: {watch.seller_name}</p>
      <VerificationBadges verification={watch.verification} />
      <Link to={`/watches/${watch.id}`}>View Details</Link>
    </div>
  );
}
