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

export default function SingleBlogPage() {
  const params = useParams();
  const slug = params?.slug;

  const [blog, setBlog] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (!slug) return;

    const fetchBlog = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await axios.get(`${API_BASE_URL}/visitor/blogs/${slug}`);
        if (res.data && res.data.status) {
          setBlog(res.data.data);
        } else {
          setError("Blog post not found.");
        }
      } catch (err) {
        console.error("Error loading blog:", err);
        setError("This blog post could not be found or has not been published yet.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchBlog();
  }, [slug]);

  const handleLike = async () => {
    if (!blog || isLiked) return;
    setIsLiked(true);
    setBlog((prev) => ({ ...prev, likes: (prev.likes || 0) + 1 }));

    try {
      await axios.post(`${API_BASE_URL}/visitor/blogs/${blog.id}/like`);
    } catch (_) {}
  };

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const getFullImageUrl = (path) => {
    if (!path) return "/visitor/home/1775506047_Tata-Safari-Facelift-1160x653.webp";
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    return `${BACKEND_BASE_URL}${path}`;
  };

  return (
    <div className="visitor-page single-blog-page">
      <VisitorNavbar onOpenSearch={() => setIsModalOpen(true)} />

      <main style={{ minHeight: "60vh" }}>
        {/* Banner */}
        <section className="blogs-banner" style={{ padding: "60px 0" }}>
          <div className="container">
            <h1 className="blogs-banner-title" style={{ fontSize: "2rem" }}>
              {blog ? blog.title : "Blog Details"}
            </h1>
            <nav className="blogs-breadcrumb" aria-label="breadcrumb">
              <Link href="/">Home</Link>
              <span>-</span>
              <Link href="/blogs">Blogs</Link>
              <span>-</span>
              <span>{blog ? blog.title : "Article"}</span>
            </nav>
          </div>
        </section>

        {/* Content Section */}
        <section className="py-5 bg-white">
          <div className="container" style={{ maxWidth: "860px" }}>
            {isLoading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status"></div>
                <div className="mt-3 text-muted">Loading article details...</div>
              </div>
            ) : error ? (
              <div className="text-center py-5">
                <i className="bi bi-exclamation-triangle fs-1 text-warning d-block mb-2"></i>
                <h4 className="fw-bold">{error}</h4>
                <p className="text-muted">The requested blog post may have been moved or unpublished.</p>
                <Link href="/blogs" className="btn btn-primary mt-3">
                  <i className="bi bi-arrow-left me-1"></i> Back to All Blogs
                </Link>
              </div>
            ) : blog ? (
              <article className="blog-article-body">
                {/* Meta details bar */}
                {blog.publish_date && (
                  <div className="pb-3 mb-4 border-bottom">
                    <span className="text-muted small d-flex align-items-center gap-1">
                      <i className="bi bi-calendar3 text-primary"></i>
                      <strong>Published:</strong> {blog.publish_date}
                    </span>
                  </div>
                )}

                {/* Featured Image */}
                {blog.image && (
                  <div className="mb-4 text-center">
                    <img
                      src={getFullImageUrl(blog.image)}
                      alt={blog.title}
                      className="img-fluid rounded-3 shadow-sm"
                      style={{ maxHeight: "480px", width: "100%", objectFit: "cover" }}
                    />
                  </div>
                )}

                {/* Rich HTML Content from CKEditor */}
                <div
                  className="blog-rich-content lh-lg"
                  style={{ fontSize: "16px", color: "#333" }}
                  dangerouslySetInnerHTML={{ __html: blog.details }}
                />

                {/* Back Link */}
                <div className="mt-5 pt-4 border-top d-flex justify-content-between align-items-center">
                  <Link href="/blogs" className="btn btn-outline-primary">
                    <i className="bi bi-arrow-left me-1"></i> Back to Blogs
                  </Link>
                 
                </div>
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
