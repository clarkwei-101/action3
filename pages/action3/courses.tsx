'use client';
import * as React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Action3Layout } from '~/apps/action3/shared/Action3Layout';
import { useRouter } from 'next/router';

interface Course {
  title: string;
  platform: string;
  platformUrl: string;
  url: string;
  rating: number | null;
  ratingCount: number | null;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | null;
  workload: string | null;
  free: boolean;
  imageUrl: string | null;
}

interface CourseSearchResult {
  courses: Course[];
  total: number;
  page: number;
  query: string;
  category: string | null;
}

interface Category {
  id: string;
  label: string;
  query: string;
}

const DIFFICULTY_CONFIG = {
  Beginner: { label: '入门', bg: 'rgba(16,185,129,0.15)', color: '#10b981' },
  Intermediate: { label: '进阶', bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
  Advanced: { label: '高级', bg: 'rgba(239,68,68,0.15)', color: '#ef4444' },
};

const PLATFORM_COLORS: Record<string, string> = {
  coursera: '#0056d2',
  edx: '#193a65',
  udemy: '#a435f0',
  udacity: '#02b3e4',
  'khan academy': '#14bf96',
  'mit ocw': '#a31f34',
  'harvard': '#a43438',
  stanford: '#8c1515',
  youtube: '#ff0000',
  linkedin: '#0a66c2',
  pluralsight: '#7a84ff',
  futurelearn: '#1e6c31',
  openlearn: '#0094bc',
  alison: '#d4622a',
};

const CATEGORIES: Category[] = [
  { id: 'all', label: '全部', query: '' },
  { id: 'programming', label: '编程', query: 'programming' },
  { id: 'data-science', label: '数据科学', query: 'data science' },
  { id: 'ai-ml', label: 'AI & 机器学习', query: 'artificial intelligence' },
  { id: 'web-dev', label: 'Web 开发', query: 'web development' },
  { id: 'python', label: 'Python', query: 'python' },
  { id: 'javascript', label: 'JavaScript', query: 'javascript' },
  { id: 'business', label: '商业管理', query: 'business' },
  { id: 'design', label: '设计', query: 'design' },
  { id: 'math', label: '数学统计', query: 'statistics' },
  { id: 'language', label: '语言学习', query: 'language learning' },
  { id: 'health', label: '健康心理', query: 'health' },
];

function getPlatformColor(platform: string): string {
  const p = platform.toLowerCase();
  for (const [key, color] of Object.entries(PLATFORM_COLORS)) {
    if (p.includes(key)) return color;
  }
  return '#10b981';
}

function StarRating({ rating }: { rating: number | null }) {
  if (!rating) return null;
  const full = Math.floor(rating);
  const hasHalf = rating - full >= 0.5;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width="12" height="12" viewBox="0 0 24 24">
          {i < full ? (
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#f59e0b" />
          ) : i === full && hasHalf ? (
            <>
              <defs>
                <linearGradient id="half">
                  <stop offset="50%" stopColor="#f59e0b" />
                  <stop offset="50%" stopColor="rgba(255,255,255,0.1)" />
                </linearGradient>
              </defs>
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="url(#half)" />
            </>
          ) : (
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="rgba(255,255,255,0.1)" />
          )}
        </svg>
      ))}
      <span style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 600, marginLeft: '4px' }}>
        {rating.toFixed(1)}
      </span>
    </div>
  );
}

function CourseCard({ course, onClick, idx }: { course: Course; onClick: () => void; idx: number }) {
  const [hovered, setHovered] = useState(false);
  const platformColor = getPlatformColor(course.platform);
  const diffConfig = course.difficulty ? DIFFICULTY_CONFIG[course.difficulty] : null;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered
          ? 'rgba(255,255,255,0.05)'
          : 'rgba(255,255,255,0.025)',
        backdropFilter: 'blur(20px) saturate(150%)',
        WebkitBackdropFilter: 'blur(20px) saturate(150%)',
        border: `1px solid ${hovered ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.07)'}`,
        borderRadius: '16px',
        padding: '20px',
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.32,0.72,0,1)',
        animation: `fadeInUp 0.4s ease ${idx * 0.05}s both`,
        boxShadow: hovered
          ? '0 16px 48px rgba(0,0,0,0.4), 0 0 20px rgba(16,185,129,0.1), inset 0 1px 0 rgba(255,255,255,0.08)'
          : '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
        {/* Platform badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          background: `${platformColor}18`,
          border: `1px solid ${platformColor}30`,
          borderRadius: '8px',
          fontSize: '11px',
          fontWeight: 600,
          color: platformColor,
        }}>
          <div style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: platformColor,
          }} />
          {course.platform}
        </div>

        {/* Difficulty badge */}
        {diffConfig && (
          <span style={{
            fontSize: '10px',
            padding: '3px 8px',
            borderRadius: '999px',
            background: diffConfig.bg,
            color: diffConfig.color,
            fontWeight: 600,
          }}>
            {diffConfig.label}
          </span>
        )}
      </div>

      {/* Title */}
      <h3 style={{
        fontSize: '14px',
        fontWeight: 600,
        color: hovered ? '#fff' : '#e2e8f0',
        marginBottom: '10px',
        lineHeight: 1.4,
        transition: 'color 0.2s',
        overflow: 'hidden',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
      }}>
        {course.title}
      </h3>

      {/* Rating & Workload */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <StarRating rating={course.rating} />
        {course.workload && (
          <span style={{ fontSize: '11px', color: '#64748b' }}>
            {course.workload}
          </span>
        )}
      </div>

      {/* Free tag + Rating count */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{
          fontSize: '11px',
          padding: '3px 10px',
          borderRadius: '999px',
          background: 'rgba(16,185,129,0.12)',
          border: '1px solid rgba(16,185,129,0.2)',
          color: '#10b981',
          fontWeight: 600,
        }}>
          免费
        </span>
        {course.ratingCount && (
          <span style={{ fontSize: '11px', color: '#64748b' }}>
            {course.ratingCount.toLocaleString()} 人评价
          </span>
        )}
      </div>

      {/* Hover arrow indicator */}
      <div style={{
        position: 'absolute',
        bottom: '12px',
        right: '12px',
        opacity: hovered ? 1 : 0,
        transform: hovered ? 'translateX(0)' : 'translateX(-8px)',
        transition: 'all 0.2s',
        color: '#10b981',
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  );
}

function EmptyState({ hasError }: { hasError: boolean }) {
  return (
    <div style={{
      textAlign: 'center',
      padding: '80px 20px',
      color: '#64748b',
    }}>
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ margin: '0 auto 16px', opacity: 0.4, display: 'block' }}>
        <path d="M11 19a8 8 0 100-16 8 8 0 000 16zm1-6h-2v2H8v-2H6v-2h2V9h2v2h2v2z" />
      </svg>
      <p style={{ fontSize: '16px', marginBottom: '8px' }}>
        {hasError ? '课程加载失败' : '暂无课程'}
      </p>
      <p style={{ fontSize: '13px', opacity: 0.6 }}>
        {hasError ? '可能是网络问题，请稍后重试' : '尝试切换分类或搜索关键词'}
      </p>
    </div>
  );
}

export default function CoursesPage() {
  return (
    <Action3Layout>
      <CoursesPageContent />
    </Action3Layout>
  );
}

function CoursesPageContent() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [total, setTotal] = useState(0);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  const fetchCourses = useCallback(async (searchQuery: string, category: string) => {
    setIsLoading(true);
    setHasError(false);

    try {
      const cat = CATEGORIES.find(c => c.id === category);
      const combinedQuery = category === 'all'
        ? searchQuery
        : [cat?.query, searchQuery].filter(Boolean).join(' ');

      const res = await fetch('/api/action3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'course.search',
          query: combinedQuery || undefined,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: CourseSearchResult = await res.json();
      setCourses(data.courses || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('[Courses] Fetch error:', err);
      setHasError(true);
      setCourses([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchCourses('', 'all');
  }, [fetchCourses]);

  const handleCategoryChange = (categoryId: string) => {
    setActiveCategory(categoryId);
    setQuery('');
    const cat = CATEGORIES.find(c => c.id === categoryId);
    fetchCourses('', categoryId);
  };

  const handleSearchChange = (value: string) => {
    setQuery(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      const cat = CATEGORIES.find(c => c.id === activeCategory);
      const combinedQuery = activeCategory === 'all'
        ? value
        : [cat?.query, value].filter(Boolean).join(' ');
      fetchCourses(combinedQuery, activeCategory);
    }, 600);
  };

  const handleCourseClick = (course: Course) => {
    // Open course in new tab using system browser
    window.open(course.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div style={{ padding: '32px', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#e2e8f0', marginBottom: '6px' }}>
          学习资源
        </h1>
        <p style={{ fontSize: '13px', color: '#64748b' }}>
          来自 Class Central 的免费优质课程，分类整理，随时学习
        </p>
      </div>

      {/* Search Bar */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '20px',
      }}>
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 16px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px',
          transition: 'border-color 0.2s',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            value={query}
            onChange={e => handleSearchChange(e.target.value)}
            placeholder="搜索课程..."
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              outline: 'none',
              color: '#e2e8f0',
              fontSize: '14px',
            }}
          />
          {query && (
            <button
              onClick={() => { setQuery(''); fetchCourses('', activeCategory); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 0 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Category Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        overflowX: 'auto',
        paddingBottom: '4px',
        marginBottom: '24px',
        scrollbarWidth: 'none',
      }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => handleCategoryChange(cat.id)}
            style={{
              padding: '7px 16px',
              background: activeCategory === cat.id
                ? 'rgba(16,185,129,0.15)'
                : 'rgba(255,255,255,0.03)',
              border: `1px solid ${activeCategory === cat.id ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.07)'}`,
              borderRadius: '999px',
              color: activeCategory === cat.id ? '#10b981' : '#94a3b8',
              fontSize: '13px',
              fontWeight: activeCategory === cat.id ? 600 : 400,
              cursor: 'pointer',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Results count */}
      {!isLoading && total > 0 && (
        <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
          共找到 <span style={{ color: '#10b981', fontWeight: 600 }}>{total}</span> 个免费课程
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '16px',
        }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.025)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '16px',
              padding: '20px',
              height: '160px',
              animation: `shimmer 1.5s ease infinite`,
            }} />
          ))}
        </div>
      )}

      {/* Course Grid */}
      {!isLoading && !hasError && courses.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '16px',
        }}>
          {courses.map((course, idx) => (
            <CourseCard
              key={course.url}
              course={course}
              idx={idx}
              onClick={() => handleCourseClick(course)}
            />
          ))}
        </div>
      )}

      {/* Empty / Error State */}
      {!isLoading && (hasError || courses.length === 0) && (
        <EmptyState hasError={hasError} />
      )}

      {/* Styles */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0% { opacity: 0.4; }
          50% { opacity: 0.6; }
          100% { opacity: 0.4; }
        }
        * { scrollbar-width: none; }
        ::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
