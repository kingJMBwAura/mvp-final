export default function VerificationBadges({ verification }) {
  return (
    <div className="badges">
      {verification?.docs_verified && <span>Docs Verified</span>}
      {verification?.physically_inspected && <span>Physically Inspected</span>}
      {verification?.fully_authenticated && <span>Fully Authenticated</span>}
    </div>
  );
}