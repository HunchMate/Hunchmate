import { memo, useEffect, useRef, useMemo } from 'react'
import Hls from 'hls.js'

const VIDEO_SRC = 'https://stream.mux.com/hUT6X11m1Vkw1QMxPOLgI761x2cfpi9bHFbi5cNg4014.m3u8'

const BackgroundVideo = memo(function BackgroundVideo() {
  const videoRef = useRef(null)
  const hlsRef = useRef(null)

  // Detect mobile and network conditions
  const isMobile = useMemo(() => /mobile|android|iphone/i.test(navigator.userAgent), [])
  const connection = useMemo(() => navigator.connection, [])
  const isSlowNetwork = useMemo(() => {
    return !connection || connection.effectiveType === '3g' || connection.effectiveType === '4g'
  }, [connection])

  // Skip video on mobile for better performance
  if (isMobile) {
    return (
      <div className="fixed inset-0 -z-10 w-full h-full overflow-hidden bg-gradient-to-br from-orange-500 via-purple-600 to-blue-600" />
    )
  }

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        maxBufferLength: isSlowNetwork ? 15 : 60,
        maxMaxBufferLength: isSlowNetwork ? 30 : 120,
        maxBufferSize: isSlowNetwork ? 30 * 1000 * 1000 : 60 * 1000 * 1000,
        startLevel: isSlowNetwork ? 0 : -1,
        abrEwmaDefaultEstimate: isSlowNetwork ? 1000000 : 5000000,
      })
      hlsRef.current = hls

      hls.loadSource(VIDEO_SRC)
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {})
      })

      return () => {
        hls.stopLoad()
        hls.detachMedia()
        hls.destroy()
        hlsRef.current = null
      }
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = VIDEO_SRC
      video.addEventListener('loadedmetadata', () => {
        video.play().catch(() => {})
      })
    }
  }, [isSlowNetwork])

  return (
    <div className="fixed inset-0 -z-10 w-full h-full overflow-hidden">
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        style={{ willChange: 'transform', transform: 'translateZ(0)' }}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
      />
    </div>
  )
})

export default BackgroundVideo
