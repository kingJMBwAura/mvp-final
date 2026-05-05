import "../styles/About.css";
import KronosHeader from "../components/KronosHeader";
import aboutWatch from "../assets/images/about-watch.jpg";

export default function About() {
  return (
    <div className="page-shell about-page">
      <KronosHeader />

      <section className="about-section">
        <div className="about-section__left">
          <img src={aboutWatch} alt="Luxury watch detail" />
          <div className="about-section__overlay">
            <h2 className="about-section__title section-heading-serif">About Us</h2>
            <p className="about-section__subtitle">
              Curating legacies. Returning time.
            </p>
          </div>
        </div>

        <div className="about-section__right">
          <div className="about-section__block">
            <h3 className="about-section__heading section-heading-serif">Who We Are</h3>
            <p className="about-section__text">
              Kronos Concierge is a premium digital marketplace and concierge
              service dedicated to luxury watches and fine timepieces. We connect
              discerning buyers and trusted sellers through a secure, transparent
              platform powered by rigorous authentication, escrow-protected
              payments, insured shipping, and a money-back guarantee.
            </p>
          </div>

          <div className="about-section__block">
            <h3 className="about-section__heading section-heading-serif">What we do</h3>
            <p className="about-section__text">
              From verification and secure transactions to curated listings and
              personalized sourcing, we simplify every step of the luxury watch
              journey—ensuring authenticity, protecting investments, and
              delivering a seamless, worry-free experience for collectors,
              professionals, and enthusiasts who value time, trust, and
              craftsmanship.
            </p>
          </div>

          <div className="about-section__block">
            <h3 className="about-section__heading section-heading-serif">Our Mission</h3>
            <p className="about-section__text">
              To protect investments, preserve craftsmanship, and make luxury
              watch buying and selling more secure, transparent, and accessible.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
