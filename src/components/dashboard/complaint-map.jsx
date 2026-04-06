"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { STATUS_LABELS } from "@/lib/constants";

// Color map for markers
const MARKER_COLORS = {
    submitted: "#3b82f6",
    under_review: "#06b6d4",
    assigned: "#6366f1",
    in_progress: "#f59e0b",
    resolved: "#10b981",
    closed: "#64748b",
};

function createIcon(status) {
    const color = MARKER_COLORS[status] || "#3b82f6";
    return L.divIcon({
        className: "",
        html: `
            <div style="position:relative;width:22px;height:30px;filter:drop-shadow(0 2px 3px rgba(0,0,0,.35));">
                <svg width="22" height="30" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 31C12 31 22 19.9 22 12C22 6.477 17.523 2 12 2C6.477 2 2 6.477 2 12C2 19.9 12 31 12 31Z" fill="${color}" stroke="white" stroke-width="2"/>
                    <circle cx="12" cy="12" r="4" fill="white"/>
                </svg>
            </div>
        `,
        iconSize: [22, 30],
        iconAnchor: [11, 29],
        popupAnchor: [0, -24],
    });
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function shortText(value, max = 90) {
    if (!value) return "-";
    const clean = String(value).trim();
    return clean.length > max ? `${clean.slice(0, max)}...` : clean;
}

export function ComplaintMap({ complaints = [] }) {
    const mapRef = useRef(null);
    const mapInstance = useRef(null);

    useEffect(() => {
        if (mapInstance.current) return;

        const map = L.map(mapRef.current, {
            center: [9.59, 76.52], // Kottayam default
            zoom: 10,
            scrollWheelZoom: true,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "&copy; OpenStreetMap contributors",
        }).addTo(map);

        mapInstance.current = map;

        return () => {
            map.remove();
            mapInstance.current = null;
        };
    }, []);

    useEffect(() => {
        const map = mapInstance.current;
        if (!map) return;

        // Clear existing markers
        map.eachLayer((layer) => {
            if (layer instanceof L.Marker) map.removeLayer(layer);
        });

        const markers = [];

        for (const c of complaints) {
            if (!c.latitude || !c.longitude) continue;
                        const imageUrl = c.complaint_images?.[0]?.image_url || "";
                        const title = escapeHtml(c.tracking_id || "Complaint");
                        const category = escapeHtml(
                                `${c.category || "-"}${c.sub_category ? ` - ${c.sub_category}` : ""}`,
                        );
                        const status = escapeHtml(STATUS_LABELS[c.status] || c.status || "-");
                        const description = escapeHtml(shortText(c.description));
                        const detailsHref = `/complaint/${encodeURIComponent(c.tracking_id)}?from=dashboard`;

            const marker = L.marker([c.latitude, c.longitude], {
                icon: createIcon(c.status),
            }).addTo(map);

            marker.bindPopup(`
                <div style="min-width:240px;max-width:260px;">
                    <p style="font-weight:700;font-size:13px;margin:0 0 6px;color:#0f172a;">${title}</p>
                    <p style="font-size:12px;margin:0 0 4px;color:#334155;">${category}</p>
                    <p style="font-size:11px;color:#64748b;margin:0 0 8px;">${status}</p>
                    ${imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="Complaint" style="width:100%;height:110px;object-fit:cover;border-radius:8px;border:1px solid #e2e8f0;margin-bottom:8px;" />` : ""}
                    <p style="font-size:12px;line-height:1.4;color:#334155;margin:0 0 10px;">${description}</p>
                    <a href="${detailsHref}" style="display:inline-block;padding:6px 10px;border-radius:8px;background:#2563eb;color:white;text-decoration:none;font-size:12px;font-weight:600;">View Details</a>
        </div>
      `);

            markers.push(marker);
        }

        if (markers.length > 0) {
            const group = L.featureGroup(markers);
            map.fitBounds(group.getBounds().pad(0.1));
        }
    }, [complaints]);

    return (
        <div
            ref={mapRef}
            className="h-full w-full rounded-xl"
            style={{ minHeight: "400px" }}
        />
    );
}
