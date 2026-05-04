import { Link } from "react-router";
import VerificationBadges from "./VerificationBadges";

export default function WatchCard({ watch }) {
  return (
    <div className="watch-card">
      <img src={watch.image_url} alt={watch.model} />
      <h3>{watch.brand} {watch.model}</h3>
      <p>{watch.condition}</p>
      <p>₱{watch.price}</p>
      <p>Seller: {watch.seller_name}</p>
      <VerificationBadges verification={watch.verification} />
      <Link to={`/watches/${watch.id}`}>View Details</Link>
    </div>
  );
}