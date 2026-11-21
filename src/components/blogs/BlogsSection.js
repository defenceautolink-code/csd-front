"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";
const BACKEND_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, "");

export default function BlogsSection() {
  const [blogs, setBlogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [likedIds, setLikedIds] = useState([]);
  const [copiedId, setCopiedId] = useState(null);

  const fetchVisitorBlogs = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/visitor/blogs`);
      if (res.data && res.data.status) {
        setBlogs(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to load visitor blogs:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVisitorBlogs();
  }, []);

  const handleLike = async (id) => {
    if (likedIds.includes(id)) return; // prevent multiple likes in same session

    setLikedIds((prev) => [...prev, id]);
    setBlogs((prev) =>
      prev.map((b) => (b.id === id ? { ...b, likes: (b.likes || 0) + 1 } : b))
    );

    try {
      await axios.post(`${API_BASE_URL}/visitor/blogs/${id}/like`);
    } catch (err) {
      console.error("Like error:", err);
    }
  };

  const handleShare = (slug, id) => {
    if (typeof window !== "undefined") {
      const shareUrl = `${window.location.origin}/blogs/${slug}`;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(shareUrl);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      }
    }
  };

  const getFullImageUrl = (path) => {
    if (!path) return "/visitor/home/1775506047_Tata-Safari-Facelift-1160x653.webp";
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    return `${BACKEND_BASE_URL}${path}`;
  };

  return (
    <div className="blogs-wrapper">
      {/* 1. Hero Banner */}
      <section className="blogs-banner">
        <div className="container">
          <h1 className="blogs-banner-title">Blogs</h1>
          <nav className="blogs-breadcrumb" aria-label="breadcrumb">
            <Link href="/">Home</Link>
            <span>-</span>
            <span>Blogs</span>
          </nav>
        </div>
      </section>

      {/* 2. Blog Cards List Section */}
      <section className="blogs-content-sec">
        <div className="container">
          {isLoading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status"></div>
              <div className="mt-3 text-muted">Loading published articles...</div>
            </div>
          ) : blogs.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="bi bi-journal-text fs-1 opacity-50 d-block mb-2"></i>
              <h4>No Blogs Published Yet</h4>
              <p>Check back soon for latest automotive and CSD updates!</p>
            </div>
          ) : (
            <div className="blogs-cards-grid">
              {blogs.map((blog) => {
                const isLiked = likedIds.includes(blog.id);
                const isCopied = copiedId === blog.id;

                return (
                  <div key={blog.id} className="blog-card-item">
                    <div className="blog-card">
                      {/* Left: Image & Stats */}
                      <div className="blog-card-image-wrap">
                        <Link href={`/blogs/${blog.slug}`} className="blog-card-img-link">
                          <img
                            src={getFullImageUrl(blog.image)}
                            alt={blog.title}
                            className="blog-card-thumb"
                            onError={(e) => {
                              e.currentTarget.src = "/visitor/home/1775506047_Tata-Safari-Facelift-1160x653.webp";
                            }}
                          />
                        </Link>
                      </div>

                      {/* Right: Content */}
                      <div className="blog-card-body">
                        {/* Publish Date Badge */}
                        {blog.publish_date && (
                          <div className="text-primary fw-semibold small mb-1 d-flex align-items-center gap-1" style={{ fontSize: "12px" }}>
                            <i className="bi bi-calendar3"></i>
                            <span>{blog.publish_date}</span>
                          </div>
                        )}

                        <h2 className="blog-card-title">
                          <Link href={`/blogs/${blog.slug}`}>{blog.title}</Link>
                        </h2>

                        <p className="blog-card-excerpt">{blog.snippet}</p>

                        <div className="blog-card-footer">
                          <Link
                            href={`/blogs/${blog.slug}`}
                            className="blog-readmore-btn"
                          >
                            Read more
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
