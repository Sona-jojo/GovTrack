"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { pick } from "@/lib/language-utils";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGES, MAX_IMAGE_SIZE_BYTES } from "@/lib/constants";
import {
  getCategories,
  getSubcategories,
  getCategoryLabel,
  getSubcategoryLabel,
} from "@/lib/categories";
import { BackArrowButton } from "@/components/ui/back-arrow-button";
import { LanguageSwitcher } from "@/components/ui/language-switcher";

export function MultiStepForm({ lang = "en", initialCategory = "" }) {
  const router = useRouter();
  const fallbackCategories = useMemo(() => getCategories(), []);
  const [runtimeCategories, setRuntimeCategories] = useState([]);
  const categories = runtimeCategories.length > 0 ? runtimeCategories : fallbackCategories;
  const isCategoryLocked = Boolean(initialCategory) && categories.some((cat) => cat.id === initialCategory);

  // ─── State Management ───────────────────────────────────────
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    category: "",
    subcategory: "",
    customSubcategory: "",
    description: "",
    images: [],
    localBodyType: "",
    localBody: null,
    ward: "",
    latitude: null,
    longitude: null,
    locationText: "",
    priority: "low",
    reporterName: "",
    reporterEmail: "",
    reporterPhone: "",
    isAnonymous: false,
  });

  const [localBodies, setLocalBodies] = useState([]);
  const [localBodiesByType, setLocalBodiesByType] = useState({});
  const [wardOptions, setWardOptions] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isWardLoading, setIsWardLoading] = useState(false);
  const [locationAccuracy, setLocationAccuracy] = useState(null);
  const [detectedLocationLabel, setDetectedLocationLabel] = useState("");
  const [suggestedWard, setSuggestedWard] = useState("");
  const [smartLocationStatus, setSmartLocationStatus] = useState("");
  const [wardWarningAcknowledged, setWardWarningAcknowledged] = useState(false);
  const [isImageProcessing, setIsImageProcessing] = useState(false);
  const [imageUploadMessage, setImageUploadMessage] = useState("");
  const [maxImageLimit, setMaxImageLimit] = useState(MAX_IMAGES);
  const isImageLimitReached = formData.images.length >= maxImageLimit;
  const isOtherSubcategorySelected = formData.subcategory === "other-custom";
  const selectedSubcategoryLabel =
    isOtherSubcategorySelected
      ? formData.customSubcategory?.trim()
      : getSubcategoryLabel(formData.category, formData.subcategory, "en");
  const normalizedIssueTypeFallback =
    typeof formData.subcategory === "string"
      ? formData.subcategory
          .replace(/[-_]+/g, " ")
          .replace(/\s+/g, " ")
          .trim()
      : "";

  const isValidPhoneNumber = (value) => /^\d{10}$/.test(String(value || "").trim());
  const isValidGmailAddress = (value) => /^[^\s@]+@gmail\.com$/i.test(String(value || "").trim());

  const getSubcategoryIcon = (subcategory) => {
    const value = `${subcategory?.name || ""} ${subcategory?.description || ""}`.toLowerCase();
    if (value.includes("road") || value.includes("pothole") || value.includes("bridge")) return "🛣️";
    if (value.includes("water") || value.includes("drain") || value.includes("toilet")) return "💧";
    if (value.includes("light") || value.includes("electric")) return "💡";
    if (value.includes("school") || value.includes("anganwadi") || value.includes("education")) return "🎓";
    if (value.includes("health") || value.includes("medicine") || value.includes("hospital")) return "🏥";
    if (value.includes("waste") || value.includes("pollution")) return "♻️";
    return "📌";
  };

  const getImageFingerprint = (file) =>
    [file?.name || "", file?.size || 0, file?.lastModified || 0, file?.type || ""].join("|");

  const normalizeLocationText = (value) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ");

  const getRuntimeCategoryLabel = useCallback(
    (categoryId, currentLang) => {
      const category = categories.find((item) => item.id === categoryId);
      if (category) {
        return currentLang === "ml" ? (category.nameMl || category.name) : category.name;
      }
      return getCategoryLabel(categoryId, currentLang);
    },
    [categories],
  );

  const getRuntimeSubcategories = useCallback(
    (categoryId) => {
      const category = categories.find((item) => item.id === categoryId);
      if (category && Array.isArray(category.subcategories)) {
        return category.subcategories;
      }
      return getSubcategories(categoryId);
    },
    [categories],
  );

  const buildAddressBlob = useCallback(
    (address = {}, displayName = "") =>
      [
        displayName,
        address.house_number,
        address.road,
        address.neighbourhood,
        address.suburb,
        address.village,
        address.hamlet,
        address.city,
        address.town,
        address.municipality,
        address.county,
        address.state_district,
        address.district,
        address.state,
      ]
        .filter(Boolean)
        .map(normalizeLocationText)
        .join(" "),
    [],
  );

  const formatWardLabel = useCallback((ward) => {
    if (!ward) return "";
    if (ward.name && /^ward\s/i.test(String(ward.name))) return String(ward.name).trim();
    if (ward.ward_number !== null && ward.ward_number !== undefined && String(ward.ward_number).trim()) {
      return `Ward ${ward.ward_number}`;
    }
    if (ward.name) return String(ward.name).trim();
    return "";
  }, []);

  const findBestLocalBody = useCallback(
    (addressBlob) => {
      if (!Array.isArray(localBodies) || localBodies.length === 0) return null;

      const scored = localBodies.map((body) => {
        const name = normalizeLocationText(body.name);
        const district = normalizeLocationText(body.district);
        let score = 0;

        if (!name) return { body, score: 0 };

        if (addressBlob.includes(name)) {
          score += 100;
        } else {
          const tokens = name.split(" ").filter((token) => token.length > 2);
          const hits = tokens.filter((token) => addressBlob.includes(token)).length;
          score += hits * 14;
        }

        if (district && addressBlob.includes(district)) score += 12;
        if (normalizeLocationText(body.type) && addressBlob.includes(normalizeLocationText(body.type))) score += 4;

        return { body, score };
      });

      scored.sort((a, b) => b.score - a.score);
      return scored[0]?.body || null;
    },
    [localBodies],
  );

  const suggestWardFromList = useCallback((wards, addressBlob) => {
    if (!Array.isArray(wards) || wards.length === 0) return null;

    const wardNumberMatch = addressBlob.match(/\bward\s*(\d{1,3})\b/i);
    if (wardNumberMatch) {
      const wardNumber = wardNumberMatch[1];
      const exact = wards.find((ward) => String(ward.ward_number || "").trim() === wardNumber);
      if (exact) return exact;
    }

    const tokenMatch = wards.find((ward) => {
      const wardName = normalizeLocationText(ward.name);
      if (!wardName) return false;
      const tokens = wardName.split(" ").filter((token) => token.length > 3);
      return tokens.some((token) => addressBlob.includes(token));
    });

    return tokenMatch || wards[0] || null;
  }, []);

  // Camera refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!isCategoryLocked) return;
    setFormData((prev) => {
      if (prev.category === initialCategory) return prev;
      return {
        ...prev,
        category: initialCategory,
        subcategory: "",
        customSubcategory: "",
      };
    });
  }, [initialCategory, isCategoryLocked]);

  const loadLocalBodies = useCallback(async (retryCount = 0) => {
    const maxRetries = 3;
    const timeout = 30000; // 30 seconds

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const res = await fetch("/api/local-bodies", {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const error = await res.text();
        throw new Error(`Failed to load local bodies: ${res.status} ${error}`);
      }
      const json = await res.json();
      const data = Array.isArray(json) ? json : json.data || [];

      setLocalBodies(data);

      // Group by type
      const grouped = {};
      data.forEach((lb) => {
        if (!grouped[lb.type]) grouped[lb.type] = [];
        grouped[lb.type].push(lb);
      });
      setLocalBodiesByType(grouped);
    } catch (err) {
      // Retry on timeout/network errors
      
      if (retryCount < maxRetries && (err.name === 'AbortError' || err.message.includes('fetch'))) {
        setTimeout(() => loadLocalBodies(retryCount + 1), (retryCount + 1) * 2000);
        return;
      }

      setErrors((prev) => ({
        ...prev,
        loadError: pick(
          lang,
          "Network error loading local bodies. Please check your internet connection and refresh the page.",
          "ലോക്കൽ ബോഡികൾ ലോഡ് ചെയ്യുന്നതിൽ നെറ്റ്‌വർക്ക് പിശക്. നിങ്ങളുടെ ഇന്റർനെറ്റ് കണക്ഷൻ പരിശോധിച്ച് പേജ് പുതുക്കുക."
        ),
      }));
    }
  }, [lang]);

  // ─── LocalStorage Draft ────────────────────────────────────
  const loadDraft = useCallback(() => {
    if (typeof window === "undefined") return;
    const draft = localStorage.getItem("complaint_draft");
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        const normalizedCategory =
          typeof parsed.category === "string"
            ? parsed.category
            : parsed.category?.id || "";
        const normalizedSubcategory =
          typeof parsed.subcategory === "string"
            ? parsed.subcategory
            : parsed.subcategory?.id || "";
        const normalizedWard =
          typeof parsed.ward === "string"
            ? parsed.ward
            : parsed.ward?.name || "";
        setFormData((prev) => ({
          ...prev,
          ...parsed,
          category: isCategoryLocked ? initialCategory : normalizedCategory || prev.category,
          subcategory: isCategoryLocked ? "" : normalizedSubcategory || "",
          customSubcategory: isCategoryLocked ? "" : parsed.customSubcategory || "",
          ward: normalizedWard,
        }));
        // Re-generate previews if images exist
        if (parsed.images && parsed.images.length > 0) {
          setImagePreviews(parsed.images.map((img) => img.preview));
        }
      } catch (err) {
        console.error("Error loading draft:", err);
      }
    }
  }, [initialCategory, isCategoryLocked]);

  // ─── Load Categories & Local Bodies ─────────────────────────
  useEffect(() => {
    let active = true;

    const loadRuntimeSettings = async () => {
      try {
        const res = await fetch("/api/settings/get", { cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json();
        const receivedCategories = Array.isArray(json?.data?.categories) ? json.data.categories : [];
        const settings = json?.data?.settings || {};
        const maxImages = Number(settings?.complaintRules?.maxImageUploadLimit);

        if (active && receivedCategories.length > 0) {
          setRuntimeCategories(receivedCategories);
        }
        if (active && Number.isFinite(maxImages) && maxImages > 0) {
          setMaxImageLimit(Math.min(10, Math.max(1, Math.trunc(maxImages))));
        }
      } catch {
        // Keep static categories and defaults when runtime settings are unavailable.
      }
    };

    loadRuntimeSettings();
    loadLocalBodies();
    loadDraft();
    return () => {
      active = false;
    };
  }, [loadLocalBodies, loadDraft]);

  const saveDraft = useCallback(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("complaint_draft", JSON.stringify(formData));
  }, [formData]);

  useEffect(() => {
    saveDraft();
  }, [saveDraft]);

  // ─── Handlers ──────────────────────────────────────────────
  const handleUpdateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleLocalBodyTypeChange = (type) => {
    handleUpdateField("localBodyType", type);
    handleUpdateField("localBody", null);
    handleUpdateField("ward", "");
    setWardOptions([]);
    setSuggestedWard("");
    setWardWarningAcknowledged(false);
  };

  const handleLocalBodyChange = (bodyId) => {
    const body = localBodies.find((lb) => lb.id === bodyId);
    handleUpdateField("localBody", body);
    handleUpdateField("ward", "");
    setWardWarningAcknowledged(false);
  };

  const loadWardsForLocalBody = useCallback(
    async (bodyId, addressBlob = "", shouldAutoFill = false) => {
      if (!bodyId || bodyId === "undefined" || bodyId === "null") {
        setWardOptions([]);
        setSuggestedWard("");
        return null;
      }

      setIsWardLoading(true);
      try {
        const res = await fetch(`/api/wards?local_body_id=${encodeURIComponent(bodyId)}`);
        if (!res.ok) {
          setWardOptions([]);
          setSuggestedWard("");
          setSmartLocationStatus(
            pick(
              lang,
              "Ward suggestions unavailable. You can enter the ward manually.",
              "Ward നിർദ്ദേശങ്ങൾ ലഭ്യമല്ല. നിങ്ങൾക്ക് വാർഡ് കൈയ്യോടെ നൽകാം."
            )
          );
          return null;
        }
        const json = await res.json();
        const wards = Array.isArray(json) ? json : json.data || [];
        setWardOptions(wards);

        const suggested = suggestWardFromList(wards, addressBlob);
        const suggestedLabel = formatWardLabel(suggested);
        setSuggestedWard(suggestedLabel);

        if (shouldAutoFill && suggestedLabel) {
          handleUpdateField("ward", suggestedLabel);
          setWardWarningAcknowledged(true);
        }

        return suggestedLabel;
      } catch (err) {
        console.error("Ward load error:", err);
        setWardOptions([]);
        setSuggestedWard("");
        return null;
      } finally {
        setIsWardLoading(false);
      }
    },
    [formatWardLabel, lang, suggestWardFromList]
  );

  // ─── Image Handling ───────────────────────────────────────
  const addImagePreview = (file) => {
    return new Promise((resolve) => {
      if (formData.images.length >= maxImageLimit) {
        resolve(false);
        return;
      }

      const fingerprint = getImageFingerprint(file);

      if (formData.images.some((image) => image.fingerprint === fingerprint)) {
        resolve(false);
        return;
      }

      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        setErrors((prev) => ({
          ...prev,
          images: pick(
            lang,
            "Only JPG and PNG images are allowed.",
            "Only JPG and PNG images are allowed."
          ),
        }));
        resolve(false);
        return;
      }

      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        setErrors((prev) => ({
          ...prev,
          images: pick(
            lang,
            "Each image must be smaller than 5 MB.",
            "Each image must be smaller than 5 MB."
          ),
        }));
        resolve(false);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const preview = e.target.result;
        const newImage = {
          file,
          preview,
          id: Math.random().toString(36).substr(2, 9),
          fingerprint,
        };
        let added = false;
        setFormData((prev) => {
          if (prev.images.some((image) => image.fingerprint === fingerprint)) {
            return prev;
          }
          added = true;
          return {
            ...prev,
            images: [...prev.images, newImage],
          };
        });
        if (added) {
          setImagePreviews((prev) => [...prev, preview]);
        }
        setErrors((prev) => ({ ...prev, images: "" }));
        resolve(added);
      };
      reader.onerror = () => resolve(false);
      reader.readAsDataURL(file);
    });
  };

  const handleImageInputChange = async (e) => {
    const files = Array.from(e.target.files || []);
    setIsImageProcessing(true);
    setImageUploadMessage("");

    let uploaded = 0;
    for (const file of files) {
      const ok = await addImagePreview(file);
      if (ok) uploaded++;
    }

    setIsImageProcessing(false);
    if (uploaded > 0) {
      setImageUploadMessage(
        pick(
          lang,
          "Images uploaded successfully",
          "Images uploaded successfully"
        )
      );
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add("border-blue-500", "bg-blue-50");
  };

  const handleDragLeave = (e) => {
    e.currentTarget.classList.remove("border-blue-500", "bg-blue-50");
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove("border-blue-500", "bg-blue-50");
    const files = Array.from(e.dataTransfer.files || []);

    setIsImageProcessing(true);
    setImageUploadMessage("");

    let uploaded = 0;
    for (const file of files) {
      if (file.type.startsWith("image/")) {
        const ok = await addImagePreview(file);
        if (ok) uploaded++;
      }
    }

    setIsImageProcessing(false);
    if (uploaded > 0) {
      setImageUploadMessage(
        pick(
          lang,
          "Images uploaded successfully",
          "Images uploaded successfully"
        )
      );
    }
  };

  const removeImage = (imageId) => {
    const index = formData.images.findIndex((img) => img.id === imageId);
    if (index >= 0) {
      setFormData((prev) => ({
        ...prev,
        images: prev.images.filter((_, i) => i !== index),
      }));
      setImagePreviews((prev) => prev.filter((_, i) => i !== index));
    }
    setImageUploadMessage("");
  };

  // ─── Camera ───────────────────────────────────────────────
  const openCamera = async () => {
    if (formData.images.length >= maxImageLimit) return;
    setShowCamera(true);
    setCameraReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => setCameraReady(true);
      }
    } catch (err) {
      console.error("Camera error:", err);
      setErrors((prev) => ({
        ...prev,
        camera: pick(
          lang,
          "Camera not available on this device. Please use Gallery Upload.",
          "ഈ ഉപകരണത്തിൽ ക്യാമറ ലഭ്യമല്ല. ഗാലറിയിൽ നിന്ന് അപ്‌ലോഡ് ചെയ്യുക."
        ),
      }));
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraReady(false);
    setShowCamera(false);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !cameraReady) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File(
            [blob],
            `capture-${Date.now()}.jpg`,
            { type: "image/jpeg" }
          );
          addImagePreview(file);
        }
        stopCamera();
      }, "image/jpeg", 0.92);
    }
  };

  // ─── Location ──────────────────────────────────────────────
  const [detectedLocationName, setDetectedLocationName] = useState("");
  const autoWardFillRef = useRef(false);

  const detectSmartLocation = useCallback(
    async ({ autoStart = false } = {}) => {
      if (!navigator.geolocation) {
        if (!autoStart) {
          setErrors((prev) => ({
            ...prev,
            location: "Geolocation not supported",
          }));
        }
        return;
      }

      setIsLocating(true);
      if (!autoStart) {
        setErrors((prev) => ({ ...prev, location: "" }));
      }
      setSmartLocationStatus("");

      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0,
          });
        });

        const { latitude, longitude, accuracy } = position.coords;
        const roundedAccuracy = typeof accuracy === "number" ? Math.round(accuracy) : null;
        setLocationAccuracy(roundedAccuracy);

        if (typeof accuracy === "number" && accuracy > 1000) {
          setErrors((prev) => ({
            ...prev,
            location: pick(
              lang,
              "Detected location is too inaccurate. Turn on precise location, move outdoors, and detect again.",
              "കണ്ടെത്തിയ സ്ഥലം വളരെ കൃത്യമല്ല. Precise location ഓൺ ചെയ്ത് തുറന്ന സ്ഥലത്ത് നിന്ന് വീണ്ടും കണ്ടെത്തുക."
            ),
          }));
          return;
        }

        handleUpdateField("latitude", latitude.toFixed(6));
        handleUpdateField("longitude", longitude.toFixed(6));

        if (typeof accuracy === "number" && accuracy > 150) {
          setErrors((prev) => ({
            ...prev,
            location: pick(
              lang,
              "GPS accuracy is low. Move to open sky and detect again, then edit exact location manually.",
              "GPS കൃത്യത കുറവാണ്. തുറന്ന സ്ഥലത്തേക്ക് പോയി വീണ്ടും കണ്ടെത്തുക, പിന്നെ കൃത്യമായ സ്ഥലം കൈകൊണ്ട് തിരുത്തുക."
            ),
          }));
        }

        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=jsonv2&addressdetails=1&zoom=18`,
          {
            headers: {
              "Accept-Language": lang === "ml" ? "ml,en" : "en",
            },
          }
        );
        const data = await res.json();
        const address = data.address || {};
        const addressBlob = buildAddressBlob(address, data.display_name || "");
        const parts = [
          [address.house_number, address.road].filter(Boolean).join(" "),
          address.neighbourhood || address.suburb || address.village || address.hamlet || "",
          address.city || address.town || address.municipality || address.county || "",
          address.state || "",
          address.postcode || "",
        ].filter(Boolean);
        const locationName = parts.join(", ") || data.display_name || "Location detected";
        setDetectedLocationName(locationName);
        setDetectedLocationLabel(locationName);

        handleUpdateField("locationText", locationName);

        autoWardFillRef.current = true;
      } catch (err) {
        console.error("Geolocation error:", err);
        if (!autoStart) {
          setErrors((prev) => ({
            ...prev,
            location: pick(
              lang,
              "Unable to detect location. Please allow precise location and try again in open sky.",
              "സ്ഥലം കണ്ടെത്താൻ കഴിഞ്ഞില്ല. കൃത്യമായ ലൊക്കേഷൻ അനുമതി നൽകി തുറന്ന സ്ഥലത്ത് നിന്ന് വീണ്ടും ശ്രമിക്കുക."
            ),
          }));
        }
      } finally {
        setIsLocating(false);
      }
    },
    [buildAddressBlob, lang]
  );

  useEffect(() => {
    if (!formData.localBody?.id) {
      setWardOptions([]);
      setSuggestedWard("");
      return;
    }

    const addressBlob = normalizeLocationText(detectedLocationLabel || detectedLocationName || formData.locationText);
    loadWardsForLocalBody(formData.localBody.id, addressBlob, autoWardFillRef.current);
    autoWardFillRef.current = false;
  }, [formData.localBody?.id, detectedLocationLabel, detectedLocationName, formData.locationText, loadWardsForLocalBody]);

  const normalizedWardValue = normalizeLocationText(formData.ward);
  const normalizedSuggestedWard = normalizeLocationText(suggestedWard);
  const wardMismatch = Boolean(
    normalizedSuggestedWard &&
    normalizedWardValue &&
    normalizedWardValue !== normalizedSuggestedWard &&
    !wardWarningAcknowledged
  );

  const handleWardChange = (wardValue) => {
    handleUpdateField("ward", wardValue);
    setWardWarningAcknowledged(false);
  };

  const useMyLocation = () => {
    setWardWarningAcknowledged(true);
    detectSmartLocation({ autoStart: false });
  };

  // ─── Validation ───────────────────────────────────────────
  const validateStep = (step) => {
    const newErrors = {};

    if (step === 1) {
      if (!formData.category) {
        newErrors.category = pick(lang, "Category required", "വിഭാഗം ആവശ്യമാണ്");
      }
      if (!formData.subcategory) {
        newErrors.subcategory = pick(
          lang,
          "Subcategory required",
          "ഉപ വിഭാഗം ആവശ്യമാണ്"
        );
      }
      if (formData.subcategory === "other-custom" && !formData.customSubcategory?.trim()) {
        newErrors.customSubcategory = pick(
          lang,
          "Please enter issue type",
          "Please enter issue type"
        );
      }
    }

    if (step === 2) {
      if (!formData.description?.trim()) {
        newErrors.description = pick(
          lang,
          "Please add issue description",
          "Please add issue description"
        );
      }
      // Check if images required for public property damage
      if (
        formData.category === "public-property" &&
        formData.images.length === 0
      ) {
        newErrors.images = pick(
          lang,
          "At least 1 image required for this category",
          "ഈ വിഭാഗത്തിന് കുറഞ്ഞത് 1 ഇമേജ് ആവശ്യമാണ്"
        );
      }
    }

    if (step === 3) {
      if (!formData.localBodyType) {
        newErrors.localBodyType = pick(
          lang,
          "Local body type required",
          "പ്രാദേശിക ഭരണ സ്ഥാപന തരം ആവശ്യമാണ്"
        );
      }
      if (!formData.localBody) {
        newErrors.localBody = pick(
          lang,
          "Local body required",
          "പ്രാദേശിക ഭരണ സ്ഥാപനം ആവശ്യമാണ്"
        );
      }
      if (!formData.priority) {
        newErrors.priority = pick(lang, "Priority required", "മുൻഗണന ആവശ്യമാണ്");
      }

      if (!formData.locationText?.trim()) {
        newErrors.locationText = pick(
          lang,
          "Exact location required",
          "കൃത്യമായ സ്ഥാനം ആവശ്യമാണ്"
        );
      }

      if (!formData.isAnonymous) {
        const reporterPhone = formData.reporterPhone?.trim() || "";
        const reporterEmail = formData.reporterEmail?.trim() || "";

        if (!reporterPhone && !reporterEmail) {
          newErrors.reporterContact = pick(
            lang,
            "Provide phone or email unless anonymous",
            "അജ്ഞാതമായി നൽകുന്നില്ലെങ്കിൽ ഫോൺ അല്ലെങ്കിൽ ഇമെയിൽ നൽകുക"
          );
        }

        if (reporterPhone && !isValidPhoneNumber(reporterPhone)) {
          newErrors.reporterPhone = pick(
            lang,
            "Phone number must be exactly 10 digits.",
            "ഫോൺ നമ്പർ കൃത്യമായി 10 അക്കങ്ങളായിരിക്കണം."
          );
        }

        if (reporterEmail && !isValidGmailAddress(reporterEmail)) {
          newErrors.reporterEmail = pick(
            lang,
            "Email must be a valid Gmail address.",
            "ഇമെയിൽ വിലാസം @gmail.com ആയിരിക്കണം."
          );
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ─── Navigation ───────────────────────────────────────────
  const handleNext = () => {
    if (validateStep(currentStep)) {
      saveDraft();
      setCurrentStep((prev) => Math.min(prev + 1, 4));
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  // ─── Confirmation State ───────────────────────────────────
  const [showConfirmation, setShowConfirmation] = useState(false);

  // ─── Submit ───────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validateStep(4)) return;
    // Show confirmation modal instead of direct submission
    setShowConfirmation(true);
  };

  const confirmAndSubmit = async () => {
    setShowConfirmation(false);
    setIsSubmitting(true);

    try {
      // Create complaint
      const complaintRes = await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          local_body_id: formData.localBody.id,
          category: getRuntimeCategoryLabel(formData.category, "en"),
          sub_category: selectedSubcategoryLabel || null,
          description: formData.description,
          priority: formData.priority,
          reporter_name: formData.isAnonymous ? null : formData.reporterName || null,
          reporter_email: formData.isAnonymous ? null : formData.reporterEmail || null,
          reporter_phone: formData.isAnonymous ? null : formData.reporterPhone || null,
          is_anonymous: formData.isAnonymous,
          latitude: formData.latitude || null,
          longitude: formData.longitude || null,
          location_text: formData.locationText?.trim() || null,
          district: formData.localBody.district || null,
          panchayath: formData.localBody.name || null,
        }),
      });

      if (!complaintRes.ok) {
        let errorMessage = "Failed to create complaint";
        try {
          const errorJson = await complaintRes.json();
          errorMessage =
            errorJson?.message || errorJson?.error || errorMessage;
        } catch {
          try {
            const errorText = await complaintRes.text();
            if (errorText) errorMessage = errorText;
          } catch {}
        }
        throw new Error(errorMessage);
      }

      const complaintData = await complaintRes.json();

      // Upload images if any
      if (formData.images.length > 0 && complaintData.data?.id) {
        for (const image of formData.images) {
          const fd = new FormData();
          fd.append("file", image.file);
          fd.append("image_type", "issue");

          const uploadRes = await fetch(`/api/complaints/${complaintData.data.id}/images`, {
            method: "POST",
            body: fd,
          });

          if (!uploadRes.ok) {
            let uploadError = "Failed to upload one or more images";
            try {
              const uploadJson = await uploadRes.json();
              uploadError = uploadJson?.message || uploadJson?.error || uploadError;
            } catch {}
            throw new Error(uploadError);
          }
        }
      }

      // Clear draft
      if (typeof window !== "undefined") {
        localStorage.removeItem("complaint_draft");
      }

      // Navigate to success screen
      const query = new URLSearchParams({
        trackingId: complaintData.data.tracking_id,
        priority: formData.priority,
      });

      if (complaintData.data?.is_duplicate) {
        query.set("duplicate", "1");
      }
      if (complaintData.data?.support_count) {
        query.set("supportCount", String(complaintData.data.support_count));
      }
      router.push(`/report-issue/success?${query.toString()}`);
    } catch (err) {
      console.error("Submission error:", err);
      setErrors((prev) => ({
        ...prev,
        submit: err.message || "Submission failed",
      }));
      setIsSubmitting(false);
    }
  };

  const cancelConfirmation = () => {
    setShowConfirmation(false);
  };

  // ─── Render Steps ────────────────────────────────────────
  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-gradient-to-br from-blue-100 via-white to-purple-100 px-4 py-10 sm:px-6 sm:py-14">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -left-24 top-10 h-72 w-72 ui-blob rounded-full bg-blue-300/30 blur-3xl" />
        <div className="absolute -right-20 bottom-14 h-80 w-80 ui-blob rounded-full bg-purple-300/28 blur-3xl" style={{ animationDelay: "2s" }} />
      </div>

      <section className="animate-fadeIn relative z-10 mx-auto w-full max-w-3xl rounded-3xl border border-white/30 bg-white/70 p-4 shadow-2xl backdrop-blur-xl sm:p-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-3 sm:mb-8">
          <BackArrowButton href="/" lang={lang} />
          <LanguageSwitcher lang={lang} />
        </div>

        {/* Progress Indicator */}
        <div className="mb-8 mt-2">
          <div className="flex items-center gap-1.5 sm:gap-3">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex flex-1 items-center">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 sm:h-11 sm:w-11 sm:text-sm ${
                    currentStep >= step
                      ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {currentStep > step ? "✓" : step}
                </div>
                {step < 4 && (
                  <div
                    className={`mx-2 h-1.5 flex-1 rounded transition-all duration-300 ${
                      currentStep > step
                        ? "bg-gradient-to-r from-blue-500 to-purple-500"
                        : "bg-slate-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 hidden grid-cols-4 gap-2 text-center text-[11px] font-semibold text-slate-500 sm:grid">
            <span>{pick(lang, "Category", "Category")}</span>
            <span>{pick(lang, "Description", "Description")}</span>
            <span>{pick(lang, "Location", "Location")}</span>
            <span>{pick(lang, "Review", "Review")}</span>
          </div>
          <p className="mt-2 text-center text-xs font-semibold text-slate-500 sm:hidden">
            {pick(lang, `Step ${currentStep} of 4`, `Step ${currentStep} of 4`)}
          </p>
          <div className="mt-3 text-center">
            <p className="text-sm font-semibold text-slate-700">
              {currentStep === 1 &&
                pick(lang, "Step 1: Issue Type", "ഘട്ടം 1: പ്രശ്നത്തിന്റെ തരം")}
              {currentStep === 2 &&
                pick(
                  lang,
                  "Step 2: Description & Photos",
                  "ഘട്ടം 2: വിവരണം ചിത്രങ്ങൾ"
                )}
              {currentStep === 3 &&
                pick(lang, "Step 3: Location", "ഘട്ടം 3: സ്ഥാനം")}
              {currentStep === 4 &&
                pick(
                  lang,
                  "Step 4: Review & Submit",
                  "ഘട്ടം 4: അവലോകനം സമർപ്പിക്കുക"
                )}
            </p>
          </div>
        </div>

        {/* Step Content */}
        <form onSubmit={(e) => e.preventDefault()}>
          {/* ──── STEP 1: ISSUE TYPE ──── */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-fadeIn">
              {!isCategoryLocked && (
                <div>
                  <h2 className="mb-2 text-lg font-bold text-slate-900">
                    {pick(lang, "Select Issue Category", "പ്രശ്നത്തിന്റെ വിഭാഗം തിരഞ്ഞെടുക്കുക")}
                  </h2>
                  <p className="mb-4 text-xs text-slate-600">
                    {pick(lang, "Choose the most relevant department.", "Choose the most relevant department.")}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          handleUpdateField("category", cat.id);
                          handleUpdateField("subcategory", "");
                          handleUpdateField("customSubcategory", "");
                        }}
                        className={`group relative overflow-hidden rounded-2xl border-2 p-4 text-left transition ${
                          formData.category === cat.id
                            ? `border-blue-500 bg-gradient-to-br ${cat.color} text-white shadow-lg ring-2 ring-blue-200`
                            : `border-slate-200 bg-white hover:-translate-y-1 hover:border-emerald-400 hover:shadow-lg`
                        }`}
                      >
                        <div className="absolute right-0 top-0 h-14 w-14 rounded-bl-3xl bg-white/20" />
                        <div
                          className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl text-2xl ${
                            formData.category === cat.id ? "bg-white/20" : "bg-slate-100"
                          }`}
                        >
                          {cat.icon}
                        </div>
                        <p
                          className={`mb-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                            formData.category === cat.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          Department
                        </p>
                        <p
                          className={`font-semibold text-sm ${
                            formData.category === cat.id
                              ? "text-white"
                              : "text-slate-900"
                          }`}
                        >
                          {lang === "ml" ? cat.nameMl : cat.name}
                        </p>
                      </button>
                    ))}
                  </div>
                  {errors.category && (
                    <p className="mt-2 text-sm text-red-600">{errors.category}</p>
                  )}
                </div>
              )}

              {isCategoryLocked && formData.category && (
                <div className="rounded-2xl border border-blue-200 bg-blue-50/70 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                    {pick(lang, "Selected Department", "Selected Department")}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {getRuntimeCategoryLabel(formData.category, lang)}
                  </p>
                </div>
              )}

              {/* Subcategory Selection */}
              {formData.category && (
                <div className="mt-6 animate-fadeIn">
                  <h3 className="mb-4 text-xl font-bold text-slate-900">
                    {pick(lang, "Select Sub-Category", "ഉപ-വിഭാഗം തിരഞ്ഞെടുക്കുക")}
                  </h3>
                  <div className="space-y-3">
                    {getRuntimeSubcategories(formData.category).map((sub, idx) => (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => {
                          handleUpdateField("subcategory", sub.id);
                          handleUpdateField("customSubcategory", "");
                        }}
                        className={`group relative w-full rounded-xl border p-4 text-left transition-all duration-300 ${
                          formData.subcategory === sub.id
                            ? "border-blue-500 bg-blue-50 shadow-md"
                            : "border-gray-200 bg-white/80 hover:scale-[1.02] hover:border-blue-400 hover:shadow-lg"
                        }`}
                        style={{ animationDelay: `${idx * 60}ms` }}
                      >
                        <div className="flex items-start gap-3">
                          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-lg transition group-hover:bg-blue-100">
                            {getSubcategoryIcon(sub)}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p
                              className={`text-base font-semibold ${
                                formData.subcategory === sub.id
                                  ? "text-blue-900"
                                  : "text-slate-900"
                              }`}
                            >
                              {lang === "ml" ? sub.nameMl : sub.name}
                            </p>
                            <p className="mt-1 text-sm text-gray-500">
                              {lang === "ml"
                                ? sub.descriptionMl
                                : sub.description}
                            </p>
                          </div>
                          {formData.subcategory === sub.id && (
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white">
                              ✓
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => handleUpdateField("subcategory", "other-custom")}
                      className={`group relative w-full rounded-xl border p-4 text-left transition-all duration-300 ${
                        formData.subcategory === "other-custom"
                          ? "border-blue-500 bg-blue-50 shadow-md"
                          : "border-gray-200 bg-white/80 hover:scale-[1.02] hover:border-blue-400 hover:shadow-lg"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-lg transition group-hover:bg-blue-100">
                          ✍️
                        </span>
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-base font-semibold ${
                              formData.subcategory === "other-custom"
                                ? "text-blue-900"
                                : "text-slate-900"
                            }`}
                          >
                            {pick(lang, "Other", "Other")}
                          </p>
                          <p className="mt-1 text-sm text-gray-500">
                            {pick(
                              lang,
                              "Issue not listed above? Enter your own issue type.",
                              "Issue not listed above? Enter your own issue type."
                            )}
                          </p>
                        </div>
                        {formData.subcategory === "other-custom" && (
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white">
                            ✓
                          </span>
                        )}
                      </div>
                    </button>
                  </div>
                  {isOtherSubcategorySelected && (
                    <div className="mt-3">
                      <label className="mb-2 block text-sm font-semibold text-slate-900">
                        {pick(lang, "Enter Issue Type", "Enter Issue Type")}
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.customSubcategory || ""}
                        onChange={(e) =>
                          handleUpdateField("customSubcategory", e.target.value)
                        }
                        placeholder={pick(
                          lang,
                          "e.g., Stray animals, damaged signboard, or any other issue",
                          "e.g., Stray animals, damaged signboard, or any other issue"
                        )}
                        className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                      {errors.customSubcategory && (
                        <p className="mt-2 text-sm text-red-600">
                          {errors.customSubcategory}
                        </p>
                      )}
                    </div>
                  )}
                  {errors.subcategory && (
                    <p className="mt-2 text-sm text-red-600">
                      {errors.subcategory}
                    </p>
                  )}
                </div>
              )}

              {/* AI Tip */}
              {formData.category && (
                <div className="rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 p-3 text-sm text-slate-700">
                  {categories.find((cat) => cat.id === formData.category)?.aiTip}
                </div>
              )}
            </div>
          )}

          {/* ──── STEP 2: DESCRIPTION ──── */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-fadeIn">
              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-3">
                  {pick(
                    lang,
                    "Describe the Issue",
                    "പ്രശ്നം വിവരിക്കുക"
                  )}
                  <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-3 text-lg" aria-hidden="true">📝</span>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      handleUpdateField("description", e.target.value.slice(0, 300))
                    }
                    placeholder={pick(
                      lang,
                      "Describe the issue clearly (e.g., pothole size, nearby landmarks, and impact).",
                      "Describe the issue clearly (e.g., pothole size, nearby landmarks, and impact)."
                    )}
                    rows={6}
                    className="w-full rounded-xl border-2 border-slate-200 bg-white pl-11 pr-4 py-3 text-sm outline-none transition-all duration-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div className="mt-2 flex justify-between items-center">
                  <p className="text-xs text-gray-500">
                    {formData.description.length}/300
                  </p>
                  <p className="text-xs text-blue-700">
                    {pick(lang, "Tip: Mention exact location and issue impact for faster resolution.", "Tip: Mention exact location and issue impact for faster resolution.")}
                  </p>
                </div>
                {errors.description && (
                  <p className="mt-2 text-sm text-red-600">
                    {errors.description}
                  </p>
                )}
              </div>

              {/* Images */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-3">
                  {pick(lang, "Add Photos", "ഫോട്ടോകൾ ചേർക്കുക")}
                  {formData.category === "public-property" && (
                    <span className="text-red-500">*</span>
                  )}
                </label>

                {/* Upload Area */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className="rounded-xl border-2 border-dashed border-gray-300 bg-white/80 p-5 text-center transition hover:border-blue-400 hover:bg-blue-50"
                >
                  <div className="mb-2 text-2xl" aria-hidden="true">⬆️</div>
                  <p className="mb-2 text-sm font-semibold text-slate-700">
                    {pick(
                      lang,
                      "Drag & drop images or click to upload",
                      "Drag & drop images or click to upload"
                    )}
                  </p>
                  <p className="mb-4 text-xs text-gray-500">
                    {pick(lang, "or upload using camera/gallery", "അല്ലെങ്കിൽ camera/gallery ഉപയോഗിച്ച് അപ്‌ലോഡ് ചെയ്യുക")}
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <button
                      type="button"
                      onClick={openCamera}
                      disabled={isImageLimitReached}
                      className={`inline-flex items-center gap-2 rounded-lg border border-blue-300 bg-gradient-to-r from-blue-50 to-cyan-50 px-3 py-2 text-sm font-semibold text-blue-800 transition ${
                        isImageLimitReached
                          ? "cursor-not-allowed opacity-50"
                          : "hover:shadow-md"
                      }`}
                    >
                      📷 {pick(lang, "Camera", "ക്യാമറ")}
                    </button>
                    <label
                      className={`inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-gradient-to-r from-emerald-50 to-teal-50 px-3 py-2 text-sm font-semibold text-emerald-800 transition ${
                        isImageLimitReached
                          ? "cursor-not-allowed opacity-50 pointer-events-none"
                          : "cursor-pointer hover:shadow-md"
                      }`}
                    >
                      🖼️ {pick(lang, "Gallery", "ഗ്യാലറി")}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        disabled={isImageLimitReached}
                        onChange={handleImageInputChange}
                        className="sr-only"
                      />
                    </label>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">
                    {formData.images.length}/{maxImageLimit} images | JPG, PNG | max 5 MB
                  </p>
                </div>

                {isImageProcessing && (
                  <p className="mt-2 text-sm text-blue-700 animate-pulse">
                    {pick(lang, "Uploading images...", "Uploading images...")}
                  </p>
                )}

                {imageUploadMessage && (
                  <p className="mt-2 text-sm text-emerald-700">
                    {imageUploadMessage}
                  </p>
                )}

                {/* Previews */}
                {imagePreviews.length > 0 && (
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {formData.images.map((image, idx) => (
                      <div key={image.id} className="group relative">
                        <Image
                          src={image.preview}
                          alt={`Preview ${idx + 1}`}
                          width={150}
                          height={150}
                          className="h-24 w-full rounded-lg border border-slate-200 object-cover shadow-sm"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(image.id)}
                          className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white shadow opacity-0 transition group-hover:opacity-100"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {errors.images && (
                  <p className="mt-2 text-sm text-red-600">{errors.images}</p>
                )}
                {errors.camera && (
                  <p className="mt-2 text-sm text-amber-700">{errors.camera}</p>
                )}
              </div>
            </div>
          )}

          {/* ──── STEP 3: LOCATION ──── */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="ui-location-shell relative overflow-hidden rounded-3xl p-4 sm:p-5">
                <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-cyan-300/35 blur-2xl" />
                <div className="pointer-events-none absolute -left-10 bottom-0 h-28 w-28 rounded-full bg-fuchsia-300/30 blur-2xl" />

                <div className="ui-location-card relative space-y-5 rounded-2xl p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-white/45 bg-white/55 px-4 py-3 backdrop-blur-sm">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {pick(lang, "Location Details", "സ്ഥല വിശദാംശങ്ങൾ")}
                      </p>
                      <p className="text-xs text-slate-600">
                        {pick(
                          lang,
                          "Provide a clear location to speed up resolution",
                          "വേഗത്തിലുള്ള പരിഹാരത്തിനായി വ്യക്തമായ സ്ഥലം നൽകുക"
                        )}
                      </p>
                    </div>
                    <span className="text-2xl" aria-hidden="true">🗺️</span>
                  </div>

              <div className="space-y-4 rounded-2xl border border-white/50 bg-white/75 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">📍 {pick(lang, "Your Location", "നിങ്ങളുടെ സ്ഥലം")}</p>
                    <p className="mt-1 text-sm text-slate-600" title={pick(lang, "Detected using your device location", "Detected using your device location")}>
                      {detectedLocationName
                        ? detectedLocationName
                        : pick(lang, "Use the button to detect your location", "നിങ്ങളുടെ സ്ഥലം കണ്ടെത്താൻ ബട്ടൺ ഉപയോഗിക്കുക")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={useMyLocation}
                    disabled={isLocating}
                    className="ui-location-button inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition disabled:opacity-70"
                  >
                    📍 {isLocating ? pick(lang, "Detecting...", "കണ്ടെത്തുന്നു...") : pick(lang, "Use My Location", "എന്റെ സ്ഥാനം ഉപയോഗിക്കുക")}
                  </button>
                </div>

                {formData.latitude && formData.longitude && (
                  <div className="ui-location-autofill rounded-xl border border-emerald-200 bg-emerald-50/95 px-4 py-3 shadow-sm">
                    <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                      ✓ {detectedLocationName || formData.locationText || "Location detected"}
                    </p>
                    <p className="mt-1 text-xs text-emerald-600">
                      {formData.latitude}, {formData.longitude}
                    </p>
                    {locationAccuracy !== null && (
                      <p className="mt-1 text-xs text-emerald-700">
                        {pick(lang, "Accuracy", "കൃത്യത")}: ±{locationAccuracy}m
                      </p>
                    )}
                  </div>
                )}

                {errors.location && <p className="text-sm text-amber-700">{errors.location}</p>}
              </div>

              {/* Exact Location */}
              <div>
                <label className="mb-3 block text-sm font-semibold text-slate-900">
                  {pick(lang, "Exact Location / Address", "കൃത്യമായ സ്ഥലം / വിലാസം")}
                  <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-3 text-base" aria-hidden="true">📍</span>
                  <textarea
                    rows={3}
                    value={formData.locationText || ""}
                    onChange={(e) => handleUpdateField("locationText", e.target.value)}
                    placeholder={pick(lang, "Enter your location", "Enter your location")}
                    className="ui-location-input w-full rounded-xl border-2 border-slate-200 bg-white/90 pl-10 pr-4 py-3 text-sm outline-none transition"
                  />
                </div>
                {errors.locationText && <p className="mt-2 text-sm text-red-600">{errors.locationText}</p>}
              </div>

              {formData.latitude && formData.longitude && (
                <div className="rounded-xl border border-sky-200/80 bg-white/70 p-3 shadow-[0_12px_26px_-20px_rgba(2,132,199,0.55)] backdrop-blur-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
                    {pick(lang, "Mini Map Preview", "Mini Map Preview")}
                  </p>
                  <div className="mt-2 overflow-hidden rounded-lg border border-sky-100 bg-[linear-gradient(135deg,#e0f2fe_0%,#cffafe_45%,#f0f9ff_100%)] p-3">
                    <div className="flex items-center justify-between text-xs text-sky-800">
                      <span>{pick(lang, "Selected Coordinates", "Selected Coordinates")}</span>
                      <span aria-hidden="true">📌</span>
                    </div>
                    <p className="mt-1 text-xs font-semibold text-slate-700">
                      {formData.latitude}, {formData.longitude}
                    </p>
                  </div>
                </div>
              )}

              {/* Local Body Type */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-3">
                  {pick(lang, "Local Body Type", "പ്രാദേശിക ഭരണ സ്ഥാപന തരം")}
                  <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {["grama_panchayat", "municipality", "corporation", "block_panchayat", "district_panchayat"].map(
                    (type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => handleLocalBodyTypeChange(type)}
                        className={`rounded-lg border-2 p-2 text-xs font-semibold transition ${
                          formData.localBodyType === type
                            ? "border-blue-500 bg-blue-50 text-blue-900"
                            : "border-slate-200 bg-white hover:border-emerald-400"
                        }`}
                      >
                        {type.replace(/_/g, " ").toUpperCase()}
                      </button>
                    )
                  )}
                </div>
                {errors.localBodyType && (
                  <p className="mt-2 text-sm text-red-600">
                    {errors.localBodyType}
                  </p>
                )}
              </div>

              {/* Local Body Selection */}
              {formData.localBodyType && (
                <div className="animate-fadeIn">
                  <label className="block text-sm font-semibold text-slate-900 mb-3">
                    {pick(lang, "Select Local Body", "പ്രാദേശിക ഭരണ സ്ഥാപനം തിരഞ്ഞെടുക്കുക")}
                    <span className="text-red-500">*</span>
                  </label>
                  
                  {errors.loadError && (
                    <div className="mb-3 rounded-xl bg-red-50 border border-red-200 p-3">
                      <p className="text-sm text-red-700">{errors.loadError}</p>
                    </div>
                  )}
                  
                  {localBodies.length === 0 && !errors.loadError && (
                    <div className="mb-3 rounded-xl bg-amber-50 border border-amber-200 p-3">
                      <p className="text-sm text-amber-700">
                        {pick(lang, "Loading local bodies...", "പ്രാദേശിക ഭരണ സ്ഥാപനങ്ങൾ ലോഡ് ചെയ്യുന്നു...")}
                      </p>
                    </div>
                  )}
                  
                  {(localBodiesByType[formData.localBodyType] || []).length === 0 && localBodies.length > 0 && (
                    <div className="mb-3 rounded-xl bg-yellow-50 border border-yellow-200 p-3">
                      <p className="text-sm text-yellow-700">
                        {pick(lang, `No ${formData.localBodyType.replace(/_/g, " ")} found in system.`, `സിസ്റ്റത്തിൽ ${formData.localBodyType.replace(/_/g, " ")} കണ്ടെത്തിയില്ല.`)}
                      </p>
                    </div>
                  )}
                  
                  <select
                    value={formData.localBody?.id || ""}
                    onChange={(e) => handleLocalBodyChange(e.target.value)}
                    disabled={localBodies.length === 0}
                    className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:opacity-50"
                  >
                    <option value="">
                      {pick(lang, "Select...", "തിരഞ്ഞെടുക്കുക...")}
                    </option>
                    {(localBodiesByType[formData.localBodyType] || []).map(
                      (body) => (
                        <option key={body.id} value={body.id}>
                          {body.name} ({body.district})
                        </option>
                      )
                    )}
                  </select>
                  {errors.localBody && (
                    <p className="mt-2 text-sm text-red-600">
                      {errors.localBody}
                    </p>
                  )}

                </div>
              )}

                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-3">
                  {pick(lang, "Priority", "മുൻഗണന")}
                  <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    {
                      key: "low",
                      labelEn: "🟢 Low",
                      labelMl: "🟢 കുറവ്",
                      active: "bg-emerald-100 text-emerald-800 border-emerald-300",
                    },
                    {
                      key: "high",
                      labelEn: "🟡 High",
                      labelMl: "🟡 ഉയർന്ന",
                      active: "bg-amber-100 text-amber-800 border-amber-300",
                    },
                    {
                      key: "urgent",
                      labelEn: "🔴 Urgent",
                      labelMl: "🔴 അത്യാവശ്യം",
                      active: "bg-red-100 text-red-800 border-red-300",
                    },
                  ].map((priorityItem) => (
                    <button
                      key={priorityItem.key}
                      type="button"
                      onClick={() => handleUpdateField("priority", priorityItem.key)}
                      className={`rounded-lg border-2 px-3 py-2 text-sm font-semibold transition ${
                        formData.priority === priorityItem.key
                          ? priorityItem.active
                          : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                      }`}
                    >
                      {pick(lang, priorityItem.labelEn, priorityItem.labelMl)}
                    </button>
                  ))}
                </div>
                {errors.priority && (
                  <p className="mt-2 text-sm text-red-600">{errors.priority}</p>
                )}
              </div>

              {/* Citizen Info */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-semibold text-slate-900">
                    {pick(lang, "Citizen Info", "പൗരന്റെ വിവരം")}
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={formData.isAnonymous}
                      onChange={(e) => handleUpdateField("isAnonymous", e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    {pick(lang, "Submit anonymously", "അജ്ഞാതമായി സമർപ്പിക്കുക")}
                  </label>
                </div>

                <input
                  type="text"
                  value={formData.reporterName || ""}
                  onChange={(e) => handleUpdateField("reporterName", e.target.value)}
                  placeholder={pick(lang, "Your name", "നിങ്ങളുടെ പേര്")}
                  disabled={formData.isAnonymous}
                  className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]{10}"
                    maxLength={10}
                    value={formData.reporterPhone || ""}
                    onChange={(e) => handleUpdateField("reporterPhone", e.target.value)}
                    placeholder={pick(lang, "Mobile number", "മൊബൈൽ നമ്പർ")}
                    disabled={formData.isAnonymous}
                    className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                  />
                  {errors.reporterPhone && (
                    <p className="-mt-2 text-sm text-red-600 sm:col-span-2">{errors.reporterPhone}</p>
                  )}
                  <input
                    type="email"
                    value={formData.reporterEmail || ""}
                    onChange={(e) => handleUpdateField("reporterEmail", e.target.value)}
                    placeholder={pick(lang, "Email address", "ഇമെയിൽ വിലാസം")}
                    disabled={formData.isAnonymous}
                    className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                  />
                  {errors.reporterEmail && (
                    <p className="-mt-2 text-sm text-red-600 sm:col-span-2">{errors.reporterEmail}</p>
                  )}
                </div>
                {errors.reporterContact && (
                  <p className="-mt-1 text-sm text-red-600">{errors.reporterContact}</p>
                )}
              </div>
            </div>
          )}

          {/* ──── STEP 4: REVIEW & SUBMIT ──── */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-fadeIn">
              {/* Page Header */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                  {pick(lang, "Review Your Complaint", "നിങ്ങളുടെ പരാതി അവലോകനം ചെയ്യുക")}
                </h2>
                <p className="text-sm text-slate-600">
                  {pick(lang, "Please review the details before submitting. Make sure everything is correct.", "സമർപ്പിക്കുന്നതിനുമുമ്പ് വിശദാംശങ്ങൾ അവലോകനം ചെയ്യുക. എല്ലാം ശരിയാണെന്ന് ഉറപ്പാക്കുക.")}
                </p>
              </div>

              {/* Issue Details Card */}
              <div className="group rounded-2xl bg-white/70 border border-white/40 shadow-lg hover:shadow-xl p-6 transition-all duration-300 space-y-4 hover:-translate-y-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center text-white">
                    📋
                  </div>
                  <h3 className="font-bold text-lg text-slate-900">
                    {pick(lang, "Issue Details", "പ്രശ്നത്തിന്റെ വിശദാംശങ്ങൾ")}
                  </h3>
                </div>

                <div className="space-y-4">
                  {/* Category & Type Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-4">
                      <p className="text-xs uppercase tracking-wide font-semibold text-blue-700 mb-1">
                        {pick(lang, "Category", "വിഭാഗം")}
                      </p>
                      <p className="text-sm font-bold text-slate-900">
                        {getRuntimeCategoryLabel(formData.category, lang)}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl p-4">
                      <p className="text-xs uppercase tracking-wide font-semibold text-purple-700 mb-1">
                        {pick(lang, "Issue Type", "പ്രശ്നത്തിന്റെ തരം")}
                      </p>
                      <p className="text-sm font-bold text-slate-900">
                        {isOtherSubcategorySelected
                          ? formData.customSubcategory?.trim() || pick(lang, "Other", "Other")
                          : selectedSubcategoryLabel ||
                            getSubcategoryLabel(
                              formData.category,
                              formData.subcategory,
                              lang
                            ) ||
                            normalizedIssueTypeFallback ||
                            pick(lang, "Not specified", "Not specified")}
                      </p>
                    </div>
                  </div>

                  {/* Description Section */}
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-xs uppercase tracking-wide font-semibold text-slate-700 mb-2">
                      📝 {pick(lang, "Description", "വിവരണം")}
                    </p>
                    <p className="text-sm text-slate-700 leading-relaxed">
                      {formData.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Location Details Card */}
              <div className="group rounded-2xl bg-white/70 border border-white/40 shadow-lg hover:shadow-xl p-6 transition-all duration-300 space-y-4 hover:-translate-y-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-500 flex items-center justify-center text-white">
                    📍
                  </div>
                  <h3 className="font-bold text-lg text-slate-900">
                    {pick(lang, "Location Details", "സ്ഥല വിശദാംശങ്ങൾ")}
                  </h3>
                </div>

                <div className="space-y-3">
                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl p-4">
                    <p className="text-xs uppercase tracking-wide font-semibold text-emerald-700 mb-1">
                      {pick(lang, "Local Body", "പ്രാദേശിക ഭരണ സ്ഥാപനം")}
                    </p>
                    <p className="text-sm font-bold text-slate-900">
                      {formData.localBody?.name}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-xs uppercase tracking-wide font-semibold text-slate-700 mb-2">
                      📌 {pick(lang, "Exact Location", "കൃത്യമായ സ്ഥാനം")}
                    </p>
                    <p className="text-sm text-slate-700 leading-relaxed">
                      {formData.locationText}
                    </p>
                  </div>
                </div>
              </div>

              {/* Priority & Status Card */}
              <div className="group rounded-2xl bg-white/70 border border-white/40 shadow-lg hover:shadow-xl p-6 transition-all duration-300 space-y-4 hover:-translate-y-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-bold ${
                    formData.priority === "low"
                      ? "bg-gradient-to-br from-green-400 to-green-500"
                      : formData.priority === "high"
                        ? "bg-gradient-to-br from-amber-400 to-amber-500"
                        : "bg-gradient-to-br from-red-400 to-red-500"
                  }`}>
                    {formData.priority === "low" ? "🟢" : formData.priority === "high" ? "🟡" : "🔴"}
                  </div>
                  <h3 className="font-bold text-lg text-slate-900">
                    {pick(lang, "Priority & Timing", "മുൻഗണന വേലം")}
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Priority Badge */}
                  <div className={`rounded-xl p-4 border-2 overflow-hidden relative ${
                    formData.priority === "low"
                      ? "bg-gradient-to-br from-green-50 to-green-100/50 border-green-200"
                      : formData.priority === "high"
                        ? "bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200"
                        : "bg-gradient-to-br from-red-50 to-red-100/50 border-red-200"
                  }`}>
                    {formData.priority === "urgent" && (
                      <div className="absolute inset-0 animate-pulse bg-red-400/20" style={{ animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
                    )}
                    <div className="relative">
                      <p className={`text-xs uppercase tracking-wide font-bold mb-1 ${
                        formData.priority === "low"
                          ? "text-green-700"
                          : formData.priority === "high"
                            ? "text-amber-700"
                            : "text-red-700"
                      }`}>
                        {pick(lang, "Priority Level", "മുൻഗണന തലം")}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">
                          {formData.priority === "low" ? "🟢" : formData.priority === "high" ? "🟡" : "🔴"}
                        </span>
                        <p className={`text-lg font-bold ${
                          formData.priority === "low"
                            ? "text-green-900"
                            : formData.priority === "high"
                              ? "text-amber-900"
                              : "text-red-900"
                        }`}>
                          {formData.priority === "low"
                            ? pick(lang, "Low", "കുറവ്")
                            : formData.priority === "high"
                              ? pick(lang, "High", "ഉയർന്ന")
                              : pick(lang, "Urgent", "അത്യാവശ്യം")}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Estimated Resolution Time */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-2 border-blue-200 rounded-xl p-4 flex flex-col justify-center">
                    <p className="text-xs uppercase tracking-wide font-bold text-blue-700 mb-2">
                      ⏱️ {pick(lang, "Est. Resolution", "കണക്കാക്കിയ പരിഹാരം")}
                    </p>
                    <p className="text-2xl font-bold text-blue-900">
                      {formData.priority === "low"
                        ? pick(lang, "7 Days", "7 ദിവസം")
                        : formData.priority === "high"
                          ? pick(lang, "3 Days", "3 ദിവസം")
                          : pick(lang, "24 Hours", "24 മണിക്കൂർ")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Citizen Information Card */}
              <div className="group rounded-2xl bg-white/70 border border-white/40 shadow-lg hover:shadow-xl p-6 transition-all duration-300 space-y-4 hover:-translate-y-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-500 flex items-center justify-center text-white">
                    👤
                  </div>
                  <h3 className="font-bold text-lg text-slate-900">
                    {pick(lang, "Citizen Information", "പൗര വിവരങ്ങൾ")}
                  </h3>
                </div>

                {formData.isAnonymous ? (
                  <div className="space-y-3">
                    <div className="bg-slate-50 rounded-lg p-3 text-center">
                      <p className="text-sm font-semibold text-slate-700">
                        {pick(lang, "Submitted anonymously", "അജ്ഞാതമായി സമർപ്പിക്കും")}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs uppercase tracking-wide font-semibold text-slate-700 mb-1">
                        {pick(lang, "Name", "പേര്")}
                      </p>
                      <p className="text-sm font-semibold text-slate-900">
                        {formData.reporterName || "—"}
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-slate-50 rounded-lg p-3">
                        <p className="text-xs uppercase tracking-wide font-semibold text-slate-700 mb-1">
                          {pick(lang, "Phone", "ഫോൺ")}
                        </p>
                        <p className="text-sm font-semibold text-slate-900">
                          {formData.reporterPhone || "—"}
                        </p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-3">
                        <p className="text-xs uppercase tracking-wide font-semibold text-slate-700 mb-1">
                          {pick(lang, "Email", "ഇമെയിൽ")}
                        </p>
                        <p className="text-sm font-semibold text-slate-900">
                          {formData.reporterEmail || "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Attached Photos */}
              {formData.images.length > 0 && (
                <div className="group rounded-2xl bg-white/70 border border-white/40 shadow-lg hover:shadow-xl p-6 transition-all duration-300 space-y-4 hover:-translate-y-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center text-white">
                      📸
                    </div>
                    <h3 className="font-bold text-lg text-slate-900">
                      {pick(lang, "Attached Photos", "ചേർന്ന ഫോട്ടോകൾ")} ({formData.images.length})
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {formData.images.map((image, idx) => (
                      <div
                        key={image.id}
                        className="group/img relative rounded-lg overflow-hidden border-2 border-slate-200 hover:border-orange-400 transition-all hover:shadow-lg"
                      >
                        <Image
                          src={image.preview}
                          alt={`Photo ${idx + 1}`}
                          width={100}
                          height={100}
                          className="h-24 w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 transition-all" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Trust Element Footer */}
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 flex gap-2 items-start">
                <div className="flex-shrink-0 text-lg">🔒</div>
                <div>
                  <p className="text-xs uppercase tracking-wide font-semibold text-emerald-700 mb-0.5">
                    {pick(lang, "Data Security", "ഡാറ്റ സുരക്ഷ")}
                  </p>
                  <p className="text-sm text-emerald-800">
                    {pick(
                      lang,
                      "Your complaint will be securely handled by the respective department.",
                      "നിങ്ങളുടെ പരാതി സംബന്ധിത വിഭാഗം സുരക്ഷിതമായി കൈകാര്യം ചെയ്യും."
                    )}
                  </p>
                </div>
              </div>

              {/* Error Display */}
              {errors.submit && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex gap-3 items-start">
                  <div className="flex-shrink-0 text-xl">❌</div>
                  <div>
                    <p className="font-semibold text-red-900 mb-1">
                      {pick(lang, "Submission Error", "സമർപ്പണത്തിൽ പിശക്")}
                    </p>
                    <p className="text-sm text-red-700">{errors.submit}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="mt-10 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <button
              type="button"
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="w-full sm:w-auto px-6 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-700 font-semibold shadow-sm transition duration-300 hover:bg-slate-50 hover:border-slate-400 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-sm"
            >
              {pick(lang, "← Previous", "← മുൻ")}
            </button>

            {currentStep < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="w-full sm:w-auto px-7 py-3 rounded-xl bg-gradient-to-r from-blue-500 via-blue-500 to-cyan-500 text-white font-semibold shadow-lg transition duration-300 hover:scale-105 hover:shadow-xl active:scale-95"
              >
                {pick(lang, "Next →", "അടുത്ത →")}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 text-white font-bold shadow-lg transition duration-300 hover:shadow-xl hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    {pick(lang, "Submitting...", "സമർപ്പിക്കുന്നു...")}
                  </>
                ) : (
                  <>
                    ✓ {pick(lang, "Submit", "സമർപ്പിക്കുക")}
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </section>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="relative w-full max-w-md rounded-3xl bg-white shadow-2xl border border-white/40 overflow-hidden animate-fadeIn">
            {/* Modal Gradient Background */}
            <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-gradient-to-br from-emerald-400/20 to-teal-400/20 blur-3xl" />
            
            <div className="relative p-8 space-y-6">
              {/* Modal Header */}
              <div className="text-center space-y-2">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-100 to-teal-100">
                  <span className="text-3xl">🚀</span>
                </div>
                <h3 className="text-2xl font-bold text-slate-900">
                  {pick(lang, "Ready to Submit?", "സമർപ്പിക്കാൻ തയ്യാറാണ്?")}
                </h3>
                <p className="text-sm text-slate-600">
                  {pick(lang, "Please review your complaint one final time.", "നിങ്ങളുടെ പരാതി ആദ്യത്തെ തവണ അവലോകനം ചെയ്യുക.")}
                </p>
              </div>

              {/* Confirmation Message */}
              <div className="space-y-3 bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl p-4 border border-slate-200">
                <div className="flex gap-3 items-start">
                  <span className="text-2xl flex-shrink-0">✓</span>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">
                      {pick(lang, "All details verified", "എല്ലാ വിശദാംശങ്ങളും സത്യാപിതം")}
                    </p>
                    <p className="text-xs text-slate-600 mt-1">
                      {pick(lang, "Your complaint is ready for submission", "നിങ്ങളുടെ പരാതി സമർപ്പണത്തിനായി തയ്യാറാണ്")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Confirmation Details */}
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-600">{pick(lang, "Category:", "വിഭാഗം:")}</span>
                  <span className="font-semibold text-slate-900">{getRuntimeCategoryLabel(formData.category, lang)}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-600">{pick(lang, "Priority:", "മുൻഗണന:")}</span>
                  <span className="font-semibold text-slate-900">
                    {formData.priority === "low"
                      ? pick(lang, "🟢 Low", "🟢 കുറവ്")
                      : formData.priority === "high"
                        ? pick(lang, "🟡 High", "🟡 ഉയർന്ന")
                        : pick(lang, "🔴 Urgent", "🔴 അത്യാവശ്യം")}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-600">{pick(lang, "Location:", "സ്ഥാനം:")}</span>
                  <span className="font-semibold text-slate-900">{formData.localBody?.name}</span>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex flex-col gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={confirmAndSubmit}
                  disabled={isSubmitting}
                  className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 text-white font-bold shadow-lg transition duration-300 hover:shadow-xl hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      {pick(lang, "Submitting...", "സമർപ്പിക്കുന്നു...")}
                    </>
                  ) : (
                    <>
                      ✓ {pick(lang, "Yes, Submit", "അതെ, സമർപ്പിക്കുക")}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={cancelConfirmation}
                  disabled={isSubmitting}
                  className="w-full px-6 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-700 font-semibold transition duration-300 hover:bg-slate-50 hover:border-slate-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {pick(lang, "Cancel & Review", "റദ്ദ് ചെയ്യുക വിതരണം ചെയ്യണ്ട")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-4">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full rounded-xl bg-black"
            />
            <canvas ref={canvasRef} className="hidden" />
            <div className="mt-4 flex gap-3 justify-center">
              <button
                type="button"
                onClick={capturePhoto}
                disabled={!cameraReady}
                className="ui-button-primary rounded-lg px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {pick(lang, "📷 Capture", "📷 ക്യാപ്ചർ")}
              </button>
              <button
                type="button"
                onClick={stopCamera}
                className="rounded-lg border-2 border-slate-300 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700"
              >
                {pick(lang, "✕ Close", "✕ അടയ്ക്കുക")}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

