const AVATARS = [
  'https://i.pravatar.cc/80?img=12',
  'https://i.pravatar.cc/80?img=32',
  'https://i.pravatar.cc/80?img=47',
]

export default function SocialProof() {
  return (
    <div
      id="social-proof"
      className="flex items-center gap-3 mt-12"
    >
      {/* Avatar Stack */}
      <div className="avatar-stack">
        {AVATARS.map((src, i) => (
          <img
            key={i}
            src={src}
            alt={`User ${i + 1}`}
            width={36}
            height={36}
          />
        ))}
      </div>

      {/* Trust text */}
      <p className="text-white/60 text-sm font-geist">
        Trusted by{' '}
        <span className="text-white/90 font-medium">210k+</span>{' '}
        stores worldwide
      </p>
    </div>
  )
}
