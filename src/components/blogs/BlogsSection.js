"use client";

import React, { useState } from "react";
import Link from "next/link";
import { BLOGS_DATA } from "@/data/blogsData";

export default function BlogsSection() {
  const [blogs, setBlogs] = useState(BLOGS_DATA);
  const [likedIds, setLikedIds] = useState([]);
  const [copiedId, setCopiedId] = useState(null);

  const handleLike = (id) => {
    if (likedIds.includes(id)) {
      setLikedIds(likedIds.filter((item) => item !== id));
      setBlogs((prev) =>
        prev.map((b) => (b.id === id ? { ...b, likes: b.likes - 1 } : b))
      );
    } else {
      setLikedIds([...likedIds, id]);
      setBlogs((prev) =>
        prev.map((b) => (b.id === id ? { ...b, likes: b.likes + 1 } : b))
      );
    }
  };

  const handleShare = (slug, id) => {
    if (typeof window !== "undefined") {
      const shareUrl = `${window.location.origin}/blog-detail/${slug}`;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(shareUrl);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      }
    }
  };

  return (
    <div className="blogs-wrapper">
      {/* 1. Hero Banner with visitor background image */}
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
          <div className="blogs-cards-grid">
            {blogs.map((blog) => {
              const isLiked = likedIds.includes(blog.id);
              const isCopied = copiedId === blog.id;

              return (
                <div key={blog.id} className="blog-card-item">
                  <div className="blog-card">
                    {/* Left: Image & Stats */}
                    <div className="blog-card-image-wrap">
                      <Link href={`/blog-detail/${blog.slug}`} className="blog-card-img-link">
                        <img
                          src={blog.image}
                          alt={blog.title}
                          className="blog-card-thumb"
                        />
                      </Link>

                      {/* Stats under Image */}
                      <div className="blog-card-stats">
                        <button
                          type="button"
                          className={`blog-stat-btn ${isLiked ? "blog-stat-btn--active" : ""}`}
                          onClick={() => handleLike(blog.id)}
                          aria-label="Like post"
                        >
                          <i className="bi bi-hand-thumbs-up"></i>
                          <span>{blog.likes}</span>
                        </button>

                        <div className="blog-stat-item">
                          <i className="bi bi-eye"></i>
                          <span>{blog.views}</span>
                        </div>

                        <button
                          type="button"
                          className="blog-stat-btn"
                          onClick={() => handleShare(blog.slug, blog.id)}
                          title={isCopied ? "Link copied!" : "Share post"}
                          aria-label="Share post"
                        >
                          <i className={`bi ${isCopied ? "bi-check2" : "bi-share"}`}></i>
                          <span>{blog.shares}</span>
                        </button>
                      </div>
                    </div>

                    {/* Right: Content */}
                    <div className="blog-card-body">
                      <h2 className="blog-card-title">
                        <Link href={`/blog-detail/${blog.slug}`}>{blog.title}</Link>
                      </h2>

                      <p className="blog-card-excerpt">{blog.snippet}</p>

                      <div className="blog-card-footer">
                        <Link
                          href={`/blog-detail/${blog.slug}`}
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
        </div>
      </section>
    </div>
  );
}
