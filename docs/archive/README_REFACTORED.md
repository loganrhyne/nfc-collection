# NFC Collection - Refactored Services Active

✅ **The refactored services are now set as default!**

## Quick Test

To verify everything is working:

```bash
cd python-services
python test_refactored.py
```

## Starting Services

### Development
```bash
./scripts/development/startup.sh
```

### Production (Raspberry Pi)
```bash
sudo systemctl restart nfc-scanner
```

## Key Changes

1. **Configuration**: Now uses `.env` file (created from `.env.example`)
2. **Health Checks**: Available at `http://localhost:8765/health`
3. **Better Error Handling**: Custom exceptions and recovery
4. **Message Queuing**: Offline support in WebSocket
5. **Rate Limiting**: Configurable DoS protection

## Configuration

Edit `python-services/.env`:

```env
# Key settings
NFC_MOCK_MODE=false          # Set to false on Pi
WS_CORS_ORIGINS=*            # Restrict in production
WS_AUTH_ENABLED=false        # Enable for security
LOG_LEVEL=INFO               # Use DEBUG for troubleshooting
```

## Monitoring

- Health: `curl http://localhost:8765/health`
- Metrics: `curl http://localhost:8765/metrics`
- Logs: `journalctl -u nfc-scanner -f`

## Documentation

- **Migration Guide**: `MIGRATION_TO_REFACTORED.md`
- **Code Review**: `docs/development/CODE_REVIEW.md`
- **API Docs**: `docs/api/websocket-api.md`
- **Architecture**: `docs/architecture/README.md`

## Rollback (if needed)

```bash
cd python-services
cp server_original.py server.py
cp services/nfc_service_original.py services/nfc_service.py
```

---

🎉 Your NFC Collection system is now running with enterprise-grade features!