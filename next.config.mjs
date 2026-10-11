/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Lets phones on the same Wi-Fi use the dev server by IP (e.g. scanning a test QR code).
  allowedDevOrigins: ['192.168.0.110', '192.168.*.*'],
}

export default nextConfig
