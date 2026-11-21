"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import "@/app/visitor.css";
import VisitorNavbar from "@/components/visitornavbar";
import FooterSection from "@/components/home/FooterSection";
import FindCarModal from "@/components/FindCarModal";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";
const BACKEND_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, "");

export default function VisitorCrmPage() {
  const params = useParams();
  const slug = params?.slug;

  const [pageData, setPageData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!slug) return;

    const fetchPage = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await axios.get(`${API_BASE_URL}/visitor/crm-pages/${slug}`);
        if (res.data && res.data.status && res.data.data) {
          setPageData(res.data.data);
        } else {
          setError("Page not found.");
        }
      } catch (err) {
        console.error("Error loading CRM page:", err);
        setError("The requested page could not be found.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPage();
  }, [slug]);

  const getFullImageUrl = (path) => {
    if (!path) return "";
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    return `${BACKEND_BASE_URL}${path}`;
  };

  return (
    <div className="visitor-page crm-dynamic-page">
      <VisitorNavbar onOpenSearch={() => setIsModalOpen(true)} />

      <main style={{ minHeight: "65vh" }}>
        {/* Banner */}
        <section className="blogs-banner" style={{ padding: "60px 0" }}>
          <div className="container">
            <h1 className="blogs-banner-title" style={{ fontSize: "2.2rem" }}>
              {pageData ? pageData.title : "Information"}
            </h1>
            <nav className="blogs-breadcrumb" aria-label="breadcrumb">
              <Link href="/">Home</Link>
              <span>-</span>
              <span>{pageData ? pageData.title : "Page"}</span>
            </nav>
          </div>
        </section>

        {/* Content */}
        <section className="py-5 bg-white">
          <div className="container" style={{ maxWidth: "900px" }}>
            {isLoading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status"></div>
                <div className="mt-3 text-muted">Loading page content...</div>
              </div>
            ) : error ? (
              <div className="text-center py-5">
                <i className="bi bi-file-earmark-x fs-1 text-warning d-block mb-2"></i>
                <h4 className="fw-bold">{error}</h4>
                <p className="text-muted">The requested page is unavailable or has been deactivated.</p>
                <Link href="/" className="btn btn-primary mt-3">
                  <i className="bi bi-house me-1"></i> Back to Home
                </Link>
              </div>
            ) : pageData ? (
              <article className="crm-page-article">
                {pageData.img && (
                  <div className="mb-4 text-center">
                    <img
                      src={getFullImageUrl(pageData.img)}
                      alt={pageData.title}
                      className="img-fluid rounded-3 shadow-sm"
                      style={{ maxHeight: "380px", width: "100%", objectFit: "cover" }}
                    />
                  </div>
                )}

                <div
                  className="crm-page-html-content lh-lg"
                  style={{ fontSize: "16px", color: "#2d3748" }}
                  dangerouslySetInnerHTML={{ __html: pageData.detail }}
                />
              </article>
            ) : null}
          </div>
        </section>
      </main>

      <FooterSection />
      <FindCarModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
