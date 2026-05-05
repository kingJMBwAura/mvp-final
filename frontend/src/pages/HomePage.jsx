import { Link } from "react-router";
import KronosHeader from "../components/KronosHeader";
import "../styles/HomePage.css";
import heroWatch from "../assets/images/hero-watch.jpg";
import { useEffect, useState } from "react";
import { apiRequest } from "../services/api";

export default function HomePage() {
  const [featured, setFeatured] = useState([]);
  const [stats, setStats] = useState({ total_watches: 0, total_sellers: 0 });
  const [patekOfTheDay, setPatekOfTheDay] = useState(null);

  useEffect(() => {
    apiRequest("landing/")
      .then((data) => {
        setFeatured(data.featured_watches);
        setStats(data.stats);

        // Pick a Patek from featured watches, or just the first available
        const patek =
          data.featured_watches.find((w) => w.brand?.toLowerCase().includes("patek")) ||
          data.featured_watches[0] ||
          null;
        setPatekOfTheDay(patek);
      })
      .catch((err) => console.error("Error fetching landing data:", err));
  }, []);

  return (
    <div className="home-page">
      <section className="home-hero">
        <div className="home-hero__overlay">
          <div className="home-hero__cta">
            <div className="stats-banner">Currently hosting {stats.total_watches} luxury timepieces.</div>
            <Link to="/shopnow" className="kronos-pill-outline home-hero__cta-link">
              Buy a Watch
            </Link>
            <Link to="/sell" className="kronos-pill-outline home-hero__cta-link">
              List a Watch
            </Link>
          </div>
        </div>

        <div className="home-hero__bg" style={{ backgroundImage: `url(${heroWatch})` }}>
          <div className="home-hero__header" style={{ position: "relative", zIndex: 999999 }}>
            <KronosHeader overlay />
          </div>
          <div className="home-hero__content">
            <h1 className="home-hero__copy section-heading-serif">
              Curating legacies.
              <br />
              Restoring time.
            </h1>
          </div>
        </div>
      </section>

      {/* PATEK OF THE DAY */}
      {patekOfTheDay && (
        <section className="potd">
          <div className="potd__label">✦ Watch of the Day</div>

          <div className="potd__card">
            <div className="potd__image-wrap">
              {patekOfTheDay.image_url ? (
                <img
                  src={patekOfTheDay.image_url}
                  alt={`${patekOfTheDay.brand} ${patekOfTheDay.watch_name}`}
                  className="potd__image"
                />
              ) : (
                <div className="potd__image-placeholder">⌚</div>
              )}
            </div>

            <div className="potd__info">
              <p className="potd__brand">{patekOfTheDay.brand}</p>
              <h2 className="potd__name section-heading-serif">{patekOfTheDay.watch_name}</h2>
              <p className="potd__ref">Ref. {patekOfTheDay.reference_number}</p>
              <p className="potd__description">{patekOfTheDay.description}</p>
              <div className="potd__price">
                {patekOfTheDay.currency || "₱"}
                {Number(patekOfTheDay.sale_price).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </div>
              <Link to={`/watches/${patekOfTheDay.id}`} className="kronos-pill">
                View Listing →
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
