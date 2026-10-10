#!/bin/sh
# THROWAWAY: serves the prototype to phones/tablets on the same Wi-Fi.
IP=$(ipconfig getifaddr en0 2>/dev/null || hostname -I 2>/dev/null | cut -d' ' -f1)
echo "Open on any device on this Wi-Fi: http://$IP:4173/prototype.html?variant=A"
exec python3 -m http.server 4173 --bind 0.0.0.0
