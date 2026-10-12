import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { localizeArticle, uiText } from '../i18n';
import { fetchJson, formatDate } from '../services/api';

export default function ArticlePage({ articles, language = 'en' }) {
  const { id } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookmarked, setBookmarked] = useState(false);
  const [progress, setProgress] = useState(0);
  const t = uiText[language] || uiText.en;

  useEffect(() => {
    const localKey = 'novawire_bookmarks';
    const saved = JSON.parse(localStorage.getItem(localKey) || '[]');
    setBookmarked(saved.includes(id));
  }, [id]);

  useEffect(() => {
    let active = true;

    async function loadArticle() {
      try {
        setLoading(true);
        const data = await fetchJson(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/articles/${id}`);
        if (active) setArticle(data);
      } catch (error) {
        if (active) setArticle(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadArticle();
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    const onScroll = () => {
      const scrollTop = window.scrollY;
      const max = document.body.scrollHeight - window.innerHeight;
      const ratio = max > 0 ? (scrollTop / max) * 100 : 0;
      setProgress(Math.min(100, Math.max(0, ratio)));
    };

    window.addEventListener('scroll', onScroll);
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const currentArticle = useMemo(() => localizeArticle(article, language), [article, language]);

  const related = useMemo(() => {
    if (!currentArticle || !articles.length) return [];
    return articles.filter((item) => item.category === currentArticle.category && item.id !== currentArticle.id).slice(0, 3);
  }, [currentArticle, articles]);

  const toggleBookmark = () => {
    const key = 'novawire_bookmarks';
    const saved = JSON.parse(localStorage.getItem(key) || '[]');
    const next = bookmarked ? saved.filter((item) => item !== id) : [...saved, id];
    localStorage.setItem(key, JSON.stringify(next));
    setBookmarked(!bookmarked);
  };

  const shareArticle = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: article?.title || 'Fresh News story', url });
      return;
    }

    await navigator.clipboard.writeText(url);
    window.alert(t.storyCopied);
  };

  if (loading) return <div className="loading-state">{t.loadingStories}</div>;
  if (!currentArticle) return <div className="empty-state">{t.articleNotFound}</div>;

  const paragraphs = Array.isArray(currentArticle.content) && currentArticle.content.length ? currentArticle.content : [currentArticle.summary];

  return (
    <main className="article-page">
      <div className="reading-progress"><span style={{ width: `${progress}%` }} /></div>

      <article className="article-shell">
        <div className="article-header">
          <span className="eyebrow">{currentArticle.category}</span>
          <h1>{currentArticle.title}</h1>
          <div className="meta-line">
            <span>{currentArticle.author}</span>
            <span>{formatDate(currentArticle.publishedAt)}</span>
            <span>{currentArticle.readTime || '5 min read'}</span>
          </div>

          <div className="article-actions">
            <button type="button" className="secondary-button" onClick={shareArticle}>{t.share}</button>
            <button type="button" className="secondary-button" onClick={toggleBookmark}>{bookmarked ? t.saved : t.saveStory}</button>
          </div>
        </div>

        {currentArticle.image ? (
          <img
            src={currentArticle.image}
            alt={currentArticle.title}
            className="article-image"
            onError={(event) => {
              event.currentTarget.hidden = true;
            }}
          />
        ) : null}

        <div className="article-body">
          {paragraphs.map((paragraph, index) => (
            <p key={`${currentArticle.id}-${index}`}>{paragraph}</p>
          ))}
        </div>
      </article>

      <aside className="article-sidepanel">
        <div className="panel-box">
          <div className="panel-header">
            <span className="eyebrow">{t.related}</span>
            <h3>{t.moreStories}</h3>
          </div>

          <div className="related-list">
            {related.map((item) => (
              <Link key={item.id} to={item.slug ? `/article/${item.slug}` : `/article/${item.id}`} className="related-item">
                <img src={item.image} alt={item.title} />
                <div>
                  <span>{item.category}</span>
                  <h4>{item.title}</h4>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </aside>
    </main>
  );
}
