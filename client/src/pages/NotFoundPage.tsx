import { ArrowLeft, ListFilter } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../lib/hooks';

export function NotFoundPage() {
  useDocumentTitle('Lost');
  return (
    <div className="not-found container">
      <p className="eyebrow">404 / Off the shelf</p>
      <h1>This page<br />wandered off.</h1>
      <p>The address doesn't lead anywhere in the index. The good ones are still where you left them.</p>
      <div className="empty-actions">
        <Link to="/" className="button button-primary"><ArrowLeft size={15} /> Back home</Link>
        <Link to="/all" className="button button-quiet"><ListFilter size={15} /> Browse all anime</Link>
      </div>
      <span className="not-found-jp">迷子</span>
    </div>
  );
}
