/** @type {import('next').NextConfig} */
if (typeof process !== "undefined") {
  process.on("uncaughtException", (err) => {
    if (err && err.message && err.message.includes("Server is not running")) {
      // Suppress Node 22 net.Server.close known shutdown bug
      return;
    }
  });
}

const nextConfig = {
  /* config options here */
};

export default nextConfig;
