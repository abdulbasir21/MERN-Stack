import dns from 'dns';

// Fix Windows DNS resolver timing out on MongoDB Atlas SRV lookups
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch {
  // Ignore in environments that disallow setServers
}
