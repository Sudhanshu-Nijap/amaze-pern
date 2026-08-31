import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { io } from 'socket.io-client';

export default function Dashboard() {
  const [trackedProducts, setTrackedProducts] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchTracked = async () => {
    try {
      setLoading(true);
      const res = await api.get('/products/tracked');
      setTrackedProducts(res.data);
    } catch (err) {
      console.error("Failed to fetch tracked products", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTracked();

      const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000');
      socket.on('dataUpdated', (data) => {
        if (data.type === 'prices') {
          fetchTracked();
        }
      });

      return () => socket.disconnect();
    }
  }, [user]);

  const untrack = async (asin) => {
    if (!window.confirm("Remove this item from your watchlist?")) return;
    try {
      await api.delete(`/products/tracked/${asin}`);
      setTrackedProducts(prev => prev.filter(p => p.product.asin !== asin));
    } catch (err) {
      alert("Failed to remove price watch");
    }
  };

  // Summary counts
  const stats = useMemo(() => {
    let drops = 0;
    let increases = 0;
    let targetMet = 0;

    trackedProducts.forEach(item => {
      const a = item.price_analysis || {};
      if (a.trend === 'decreased') drops++;
      else if (a.trend === 'increased') increases++;
      if (a.target_reached) targetMet++;
    });

    return { total: trackedProducts.length, drops, increases, targetMet };
  }, [trackedProducts]);

  // Filtered list
  const filteredProducts = useMemo(() => {
    return trackedProducts.filter(item => {
      const a = item.price_analysis || {};
      const matchesSearch = item.product?.title?.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (filter === 'decreased') return a.trend === 'decreased';
      if (filter === 'increased') return a.trend === 'increased';
      if (filter === 'target') return a.target_reached;
      return true;
    });
  }, [trackedProducts, filter, searchQuery]);

  return (
    <div className="container py-4" style={{ maxWidth: '1140px' }}>
      {/* Minimal Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
        <div>
          <h3 className="fw-bold mb-0 d-inline-block me-2">Watchlist</h3>
          <span className="text-muted small">({stats.total} {stats.total === 1 ? 'item' : 'items'})</span>
        </div>
        <Link to="/search" className="btn btn-primary rounded-pill px-3 py-1 btn-sm fw-semibold">
          + Track Product
        </Link>
      </div>

      {/* Filter Tabs & Search */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4 pb-2 border-bottom">
        <div className="d-flex gap-1 flex-wrap">
          <button
            type="button"
            className={`btn btn-sm rounded-pill px-3 ${filter === 'all' ? 'btn-dark' : 'btn-light text-muted'}`}
            onClick={() => setFilter('all')}
          >
            All <span className="opacity-75">({stats.total})</span>
          </button>
          
          <button
            type="button"
            className={`btn btn-sm rounded-pill px-3 ${filter === 'decreased' ? 'btn-success text-white' : 'btn-light text-success'}`}
            onClick={() => setFilter('decreased')}
          >
            ↓ Drops <span className="opacity-75">({stats.drops})</span>
          </button>

          <button
            type="button"
            className={`btn btn-sm rounded-pill px-3 ${filter === 'increased' ? 'btn-danger text-white' : 'btn-light text-danger'}`}
            onClick={() => setFilter('increased')}
          >
            ↑ Increases <span className="opacity-75">({stats.increases})</span>
          </button>

          <button
            type="button"
            className={`btn btn-sm rounded-pill px-3 ${filter === 'target' ? 'btn-warning text-dark' : 'btn-light text-muted'}`}
            onClick={() => setFilter('target')}
          >
            Target Met <span className="opacity-75">({stats.targetMet})</span>
          </button>
        </div>

        <div style={{ width: '220px' }}>
          <input
            type="text"
            className="form-control form-control-sm rounded-pill px-3 bg-light border-0"
            placeholder="Search watchlist..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Product List */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
          <span className="text-muted ms-2 small">Loading watchlist...</span>
        </div>
      ) : filteredProducts.length > 0 ? (
        <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-3">
          {filteredProducts.map(({ product, target_price, price_analysis }) => {
            const a = price_analysis || {};
            const isDrop = a.trend === 'decreased';
            const isIncrease = a.trend === 'increased';
            const targetMet = a.target_reached;

            return (
              <div className="col" key={product.asin}>
                <div className="card h-100 border rounded-3 p-3 bg-white d-flex flex-column justify-content-between shadow-none" style={{ borderColor: '#eef0f2' }}>
                  <div>
                    {/* Image & Price Header */}
                    <div className="d-flex align-items-center gap-3 mb-3">
                      <Link to={`/result?url=${encodeURIComponent(product.amazon_url)}`} className="flex-shrink-0">
                        <img
                          src={product.image_url}
                          alt={product.title}
                          className="rounded"
                          style={{ width: '64px', height: '64px', objectFit: 'contain', background: '#f8f9fa' }}
                        />
                      </Link>
                      <div className="flex-grow-1 min-w-0">
                        <div className="d-flex align-items-baseline gap-2">
                          <span className="fs-5 fw-bold text-dark">₹{product.current_price}</span>
                          {isDrop && (
                            <span className="badge bg-success bg-opacity-10 text-success rounded-pill px-2 py-1 small fw-semibold">
                              ↓ ₹{Math.abs(a.price_change)} ({Math.abs(a.price_change_percent)}%)
                            </span>
                          )}
                          {isIncrease && (
                            <span className="badge bg-danger bg-opacity-10 text-danger rounded-pill px-2 py-1 small fw-semibold">
                              ↑ ₹{a.price_change} (+{a.price_change_percent}%)
                            </span>
                          )}
                        </div>
                        <div className="text-muted small">
                          Target: <span className="fw-semibold text-dark">₹{target_price}</span>
                          {targetMet && <span className="text-success ms-1 fw-bold">✓ Met</span>}
                        </div>
                      </div>
                    </div>

                    {/* Title */}
                    <Link
                      to={`/result?url=${encodeURIComponent(product.amazon_url)}`}
                      className="text-decoration-none text-dark d-block mb-3"
                    >
                      <p className="card-title title-clamp small mb-0 text-secondary" style={{ lineHeight: '1.4' }}>
                        {product.title}
                      </p>
                    </Link>
                  </div>

                  {/* Actions */}
                  <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                    <Link
                      to={`/result?url=${encodeURIComponent(product.amazon_url)}`}
                      className="text-primary text-decoration-none small fw-semibold"
                    >
                      Price History →
                    </Link>

                    <div className="d-flex align-items-center gap-2">
                      <a
                        href={product.amazon_url}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-outline-secondary btn-sm rounded-pill px-2 py-0 small"
                        style={{ fontSize: '0.75rem' }}
                      >
                        Amazon ↗
                      </a>
                      <button
                        onClick={() => untrack(product.asin)}
                        className="btn btn-link text-muted p-0 text-decoration-none small"
                        title="Remove"
                        style={{ fontSize: '0.75rem' }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-5 border rounded-3 bg-light bg-opacity-50">
          <p className="text-muted small mb-3">
            {filter !== 'all' ? `No products match the selected filter.` : "Your watchlist is empty."}
          </p>
          <Link to="/search" className="btn btn-outline-primary btn-sm rounded-pill px-3">
            Track a Product
          </Link>
        </div>
      )}
    </div>
  );
}
