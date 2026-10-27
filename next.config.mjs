/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Lets phones on the same Wi-Fi use the dev server by IP (e.g. scanning a test QR code).
  // Covers all private network ranges, since the laptop's address changes between networks.
  allowedDevOrigins: ['192.168.*.*', '10.*.*.*', '172.*.*.*'],
}

export default nextConfig
