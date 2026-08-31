import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { io } from 'socket.io-client';

const formatPrice = (val) => {
  if (val === undefined || val === null) return "0";
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '').replace(/[^0-9.]/g, '').replace(/\.$/, ''));
  if (isNaN(num)) return "0";
  return num.toLocaleString('en-IN', { maximumFractionDigits: 2 });
};

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
    <div className="container py-4" style={{ maxWidth: '1100px' }}>
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-3 border-bottom gap-2">
        <div>
          <h4 className="fw-semibold mb-0 text-dark">Watchlist</h4>
          <p className="text-muted small mb-0">{stats.total} tracked {stats.total === 1 ? 'item' : 'items'}</p>
        </div>
        <Link to="/search" className="btn btn-dark btn-sm px-3 rounded-2 fw-medium">
          Add Product
        </Link>
      </div>

      {/* Filter Tabs & Search */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div className="d-flex gap-1 flex-wrap">
          <button
            type="button"
            className={`btn btn-sm px-3 rounded-2 ${filter === 'all' ? 'btn-dark' : 'btn-outline-secondary border-0 bg-light text-muted'}`}
            onClick={() => setFilter('all')}
          >
            All ({stats.total})
          </button>
          
          <button
            type="button"
            className={`btn btn-sm px-3 rounded-2 ${filter === 'decreased' ? 'btn-success text-white' : 'btn-outline-secondary border-0 bg-light text-muted'}`}
            onClick={() => setFilter('decreased')}
          >
            Price Drops ({stats.drops})
          </button>

          <button
            type="button"
            className={`btn btn-sm px-3 rounded-2 ${filter === 'increased' ? 'btn-danger text-white' : 'btn-outline-secondary border-0 bg-light text-muted'}`}
            onClick={() => setFilter('increased')}
          >
            Price Increases ({stats.increases})
          </button>

          <button
            type="button"
            className={`btn btn-sm px-3 rounded-2 ${filter === 'target' ? 'btn-warning text-dark' : 'btn-outline-secondary border-0 bg-light text-muted'}`}
            onClick={() => setFilter('target')}
          >
            Target Met ({stats.targetMet})
          </button>
        </div>

        <div style={{ width: '220px' }}>
          <input
            type="text"
            className="form-control form-control-sm rounded-2 bg-light border-0 px-3"
            placeholder="Search watchlist..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Product Grid */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border spinner-border-sm text-secondary" role="status"></div>
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
                <div className="card h-100 border rounded-3 p-3 bg-white d-flex flex-column justify-content-between shadow-none" style={{ borderColor: '#e5e7eb' }}>
                  <div>
                    {/* Top: Image & Prices */}
                    <div className="d-flex align-items-center gap-3 mb-3">
                      <Link to={`/result?url=${encodeURIComponent(product.amazon_url)}`} className="flex-shrink-0">
                        <img
                          src={product.image_url}
                          alt={product.title}
                          className="rounded border p-1"
                          style={{ width: '60px', height: '60px', objectFit: 'contain', background: '#fafafa', borderColor: '#f0f0f0' }}
                        />
                      </Link>

                      <div className="flex-grow-1 min-w-0">
                        <div className="d-flex align-items-baseline gap-2 flex-wrap">
                          <span className="fs-5 fw-bold text-dark">₹{formatPrice(product.current_price)}</span>
                          {isDrop && (
                            <span className="badge bg-success bg-opacity-10 text-success rounded-1 px-2 py-1 small fw-medium">
                              -{formatPrice(Math.abs(a.price_change))} ({Math.abs(a.price_change_percent)}%)
                            </span>
                          )}
                          {isIncrease && (
                            <span className="badge bg-danger bg-opacity-10 text-danger rounded-1 px-2 py-1 small fw-medium">
                              +{formatPrice(a.price_change)} (+{a.price_change_percent}%)
                            </span>
                          )}
                        </div>

                        <div className="text-muted small mt-1">
                          Target: <span className="fw-medium text-dark">₹{formatPrice(target_price)}</span>
                          {targetMet && <span className="badge bg-success text-white rounded-1 ms-2 px-1 py-0 small" style={{ fontSize: '0.65rem' }}>MET</span>}
                        </div>
                      </div>
                    </div>

                    {/* Title */}
                    <Link
                      to={`/result?url=${encodeURIComponent(product.amazon_url)}`}
                      className="text-decoration-none text-dark d-block mb-3"
                    >
                      <p className="card-title title-clamp small mb-0 text-secondary" style={{ lineHeight: '1.45', height: '2.9em' }}>
                        {product.title}
                      </p>
                    </Link>
                  </div>

                  {/* Actions */}
                  <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                    <Link
                      to={`/result?url=${encodeURIComponent(product.amazon_url)}`}
                      className="text-dark text-decoration-none small fw-medium"
                    >
                      Price Details
                    </Link>

                    <div className="d-flex align-items-center gap-2">
                      <a
                        href={product.amazon_url}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-outline-secondary btn-sm rounded-2 px-2 py-1"
                        style={{ fontSize: '0.75rem' }}
                      >
                        Amazon
                      </a>
                      <button
                        onClick={() => untrack(product.asin)}
                        className="btn btn-outline-danger btn-sm rounded-2 px-2 py-1"
                        style={{ fontSize: '0.75rem' }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-5 border rounded-3 bg-light bg-opacity-25 my-4">
          <p className="text-muted small mb-3">
            {filter !== 'all' ? `No products found under this filter.` : "No products in your watchlist."}
          </p>
          <Link to="/search" className="btn btn-dark btn-sm px-3 rounded-2">
            Search Products
          </Link>
        </div>
      )}
    </div>
  );
}
