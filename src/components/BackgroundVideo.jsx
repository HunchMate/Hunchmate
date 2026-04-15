import { memo, useEffect, useRef } from 'react'
import Hls from 'hls.js'

const VIDEO_SRC = 'https://stream.mux.com/hUT6X11m1Vkw1QMxPOLgI761x2cfpi9bHFbi5cNg4014.m3u8'

const BackgroundVideo = memo(function BackgroundVideo() {
  const videoRef = useRef(null)
  const hlsRef = useRef(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        maxBufferLength: 60,
        maxMaxBufferLength: 120,
        maxBufferSize: 60 * 1000 * 1000,
        startLevel: -1,
        abrEwmaDefaultEstimate: 5000000,
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
  }, [])

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
