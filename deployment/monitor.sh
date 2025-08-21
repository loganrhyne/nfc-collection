#!/bin/bash
# Simple monitoring script for NFC Collection services

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

clear

while true; do
    echo -e "${GREEN}=== NFC Collection Monitor ===${NC}"
    echo "Time: $(date)"
    echo ""
    
    # Check WebSocket service
    if systemctl is-active --quiet nfc-websocket; then
        echo -e "WebSocket: ${GREEN}● Running${NC}"
        # Get memory usage
        PID=$(systemctl show -p MainPID nfc-websocket | cut -d= -f2)
        if [ "$PID" != "0" ]; then
            MEM=$(ps -p $PID -o %mem= | tr -d ' ')
            echo "  Memory: ${MEM}%"
        fi
    else
        echo -e "WebSocket: ${RED}● Stopped${NC}"
    fi
    
    # Check Dashboard service
    if systemctl is-active --quiet nfc-dashboard; then
        echo -e "Dashboard: ${GREEN}● Running${NC}"
    elif systemctl is-active --quiet nginx; then
        echo -e "Dashboard: ${GREEN}● Running (nginx)${NC}"
    else
        echo -e "Dashboard: ${RED}● Stopped${NC}"
    fi
    
    echo ""
    
    # Check port availability
    echo "Port Status:"
    if netstat -tuln 2>/dev/null | grep -q ":8765 "; then
        echo -e "  8765 (WebSocket): ${GREEN}● Open${NC}"
    else
        echo -e "  8765 (WebSocket): ${RED}● Closed${NC}"
    fi
    
    if netstat -tuln 2>/dev/null | grep -q ":80 "; then
        echo -e "  80 (HTTP): ${GREEN}● Open${NC}"
    else
        echo -e "  80 (HTTP): ${RED}● Closed${NC}"
    fi
    
    echo ""
    
    # System resources
    echo "System Resources:"
    echo "  CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)%"
    echo "  Memory: $(free -m | awk 'NR==2{printf "%.1f%%", $3*100/$2}')"
    echo "  Disk: $(df -h / | awk 'NR==2{print $5}')"
    echo "  Temp: $(vcgencmd measure_temp 2>/dev/null | cut -d= -f2 || echo 'N/A')"
    
    echo ""
    
    # Recent errors (last 5 lines)
    echo "Recent Errors:"
    if journalctl -u nfc-websocket -p err -n 5 --no-pager 2>/dev/null | grep -v "No entries" > /tmp/ws_errors; then
        if [ -s /tmp/ws_errors ]; then
            echo -e "${RED}WebSocket errors:${NC}"
            cat /tmp/ws_errors | tail -5 | sed 's/^/  /'
        fi
    fi
    
    echo ""
    echo "Press Ctrl+C to exit, refreshing in 5s..."
    sleep 5
    clear
done