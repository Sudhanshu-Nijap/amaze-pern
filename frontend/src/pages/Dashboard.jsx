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
  const [filter, setFilter] = useState('all'); // 'all', 'decreased', 'increased', 'target', 'buynow'
  const [sortBy, setSortBy] = useState('default'); // 'default', 'discount', 'price_asc', 'price_desc'
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
    if (!window.confirm("Remove this item from your price watchlist?")) return;
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
    let buyNowCount = 0;
    let totalSavings = 0;

    trackedProducts.forEach(item => {
      const a = item.price_analysis || {};
      if (a.trend === 'decreased') {
        drops++;
        totalSavings += Math.abs(a.price_change || 0);
      } else if (a.trend === 'increased') {
        increases++;
      }
      if (a.target_reached) targetMet++;
      if (a.verdict === 'BUY_NOW') buyNowCount++;
    });

    return { total: trackedProducts.length, drops, increases, targetMet, buyNowCount, totalSavings };
  }, [trackedProducts]);

  // Filtered & Sorted List
  const filteredProducts = useMemo(() => {
    let result = trackedProducts.filter(item => {
      const a = item.price_analysis || {};
      const matchesSearch = item.product?.title?.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (filter === 'decreased') return a.trend === 'decreased';
      if (filter === 'increased') return a.trend === 'increased';
      if (filter === 'target') return a.target_reached;
      if (filter === 'buynow') return a.verdict === 'BUY_NOW';
      return true;
    });

    if (sortBy === 'discount') {
      result.sort((a, b) => (b.price_analysis?.price_change_percent || 0) - (a.price_analysis?.price_change_percent || 0));
    } else if (sortBy === 'price_asc') {
      result.sort((a, b) => (parseFloat(a.product?.current_price) || 0) - (parseFloat(b.product?.current_price) || 0));
    } else if (sortBy === 'price_desc') {
      result.sort((a, b) => (parseFloat(b.product?.current_price) || 0) - (parseFloat(a.product?.current_price) || 0));
    }

    return result;
  }, [trackedProducts, filter, searchQuery, sortBy]);

  return (
    <div className="container py-4" style={{ maxWidth: '1140px' }}>
      {/* Top Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <div className="text-secondary small fw-medium text-uppercase mb-1" style={{ fontSize: '0.7rem', letterSpacing: '0.06em' }}>
            Overview &rsaquo; Price Monitoring
          </div>
          <h3 className="fw-bold mb-1 text-dark" style={{ letterSpacing: '-0.02em' }}>
            Watchlist
          </h3>
          <p className="text-secondary small mb-0">
            Real-time price monitoring, predictive insights, and drop alerts for your saved products.
          </p>
        </div>

        <div className="d-flex gap-2 align-items-center">
          <Link to="/search" className="btn btn-dark btn-sm px-3 py-2 rounded-2 fw-medium shadow-sm">
            + Track New Product
          </Link>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="card border-0 rounded-3 bg-white mb-4 shadow-sm" style={{ border: '1px solid #e2e8f0' }}>
        <div className="row g-0 text-center py-2">
          <div className="col-6 col-md-3 py-2 border-end border-light-subtle">
            <small className="text-secondary d-block text-uppercase fw-semibold" style={{ fontSize: '0.65rem', letterSpacing: '0.05em' }}>
              Tracked Items
            </small>
            <span className="fs-4 fw-bold text-dark">{stats.total}</span>
          </div>

          <div className="col-6 col-md-3 py-2 border-end border-light-subtle">
            <small className="text-secondary d-block text-uppercase fw-semibold" style={{ fontSize: '0.65rem', letterSpacing: '0.05em' }}>
              Price Drops
            </small>
            <span className="fs-4 fw-bold text-success">{stats.drops}</span>
          </div>

          <div className="col-6 col-md-3 py-2 border-end border-light-subtle">
            <small className="text-secondary d-block text-uppercase fw-semibold" style={{ fontSize: '0.65rem', letterSpacing: '0.05em' }}>
              Price Increases
            </small>
            <span className="fs-4 fw-bold text-danger">{stats.increases}</span>
          </div>

          <div className="col-6 col-md-3 py-2">
            <small className="text-secondary d-block text-uppercase fw-semibold" style={{ fontSize: '0.65rem', letterSpacing: '0.05em' }}>
              Target Met
            </small>
            <span className="fs-4 fw-bold text-warning-emphasis">{stats.targetMet}</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs, Search & Sort Bar */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        {/* Segmented Filter Pills */}
        <div className="d-flex gap-1 flex-wrap">
          <button
            type="button"
            className={`btn btn-sm rounded-2 px-3 fw-medium ${filter === 'all' ? 'btn-dark text-white' : 'btn-light text-secondary border'}`}
            onClick={() => setFilter('all')}
          >
            All <span className="opacity-75 ms-1">({stats.total})</span>
          </button>
          
          <button
            type="button"
            className={`btn btn-sm rounded-2 px-3 fw-medium ${filter === 'decreased' ? 'btn-success text-white' : 'btn-light text-secondary border'}`}
            onClick={() => setFilter('decreased')}
          >
            Price Drops <span className="opacity-75 ms-1">({stats.drops})</span>
          </button>

          <button
            type="button"
            className={`btn btn-sm rounded-2 px-3 fw-medium ${filter === 'increased' ? 'btn-danger text-white' : 'btn-light text-secondary border'}`}
            onClick={() => setFilter('increased')}
          >
            Price Increases <span className="opacity-75 ms-1">({stats.increases})</span>
          </button>

          <button
            type="button"
            className={`btn btn-sm rounded-2 px-3 fw-medium ${filter === 'target' ? 'btn-warning text-dark' : 'btn-light text-secondary border'}`}
            onClick={() => setFilter('target')}
          >
            Target Met <span className="opacity-75 ms-1">({stats.targetMet})</span>
          </button>

          {stats.buyNowCount > 0 && (
            <button
              type="button"
              className={`btn btn-sm rounded-2 px-3 fw-medium ${filter === 'buynow' ? 'btn-primary text-white' : 'btn-light text-secondary border'}`}
              onClick={() => setFilter('buynow')}
            >
              Buy Now Deals <span className="opacity-75 ms-1">({stats.buyNowCount})</span>
            </button>
          )}
        </div>

        {/* Search & Sort Controls */}
        <div className="d-flex gap-2 flex-grow-1 flex-md-grow-0" style={{ minWidth: '280px' }}>
          <input
            type="text"
            className="form-control form-control-sm rounded-2 bg-white border px-3 flex-grow-1"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <select
            className="form-select form-select-sm rounded-2 bg-white border"
            style={{ width: '130px' }}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="default">Default</option>
            <option value="discount">Top Discount</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border spinner-border-sm text-secondary" role="status"></div>
          <span className="text-secondary ms-2 small">Loading watchlist...</span>
        </div>
      ) : filteredProducts.length > 0 ? (
        <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-3">
          {filteredProducts.map(({ product, target_price, price_analysis }) => {
            const a = price_analysis || {};
            const isDrop = a.trend === 'decreased';
            const isIncrease = a.trend === 'increased';
            const targetMet = a.target_reached;
            const currentPriceNum = parseFloat(product.current_price) || 0;
            const targetPriceNum = parseFloat(target_price) || 0;

            // Target progress percentage
            let targetProgress = 100;
            if (targetPriceNum > 0 && currentPriceNum > targetPriceNum) {
              const initial = parseFloat(a.initial_price) || currentPriceNum;
              if (initial > targetPriceNum) {
                targetProgress = Math.max(0, Math.min(100, Math.round(((initial - currentPriceNum) / (initial - targetPriceNum)) * 100)));
              } else {
                targetProgress = Math.round((targetPriceNum / currentPriceNum) * 100);
              }
            }

            return (
              <div className="col" key={product.asin}>
                <div className="dashboard-card h-100 p-3 d-flex flex-column justify-content-between">
                  <div>
                    {/* Top Row: Thumbnail + Price & Badges */}
                    <div className="d-flex align-items-start gap-3 mb-3">
                      <Link to={`/result?url=${encodeURIComponent(product.amazon_url)}`} className="flex-shrink-0">
                        <div className="product-img-wrapper">
                          <img
                            src={product.image_url}
                            alt={product.title}
                            style={{ width: '64px', height: '64px', objectFit: 'contain' }}
                          />
                        </div>
                      </Link>

                      <div className="flex-grow-1 min-w-0">
                        {/* Current Price */}
                        <div className="d-flex align-items-baseline gap-2 flex-wrap mb-1">
                          <span className="fs-5 fw-bold text-dark">₹{formatPrice(product.current_price)}</span>
                          
                          {isDrop && (
                            <span className="badge badge-drop rounded-1 px-2 py-0.5 small fw-semibold">
                              -{formatPrice(Math.abs(a.price_change))} ({Math.abs(a.price_change_percent)}%)
                            </span>
                          )}
                          {isIncrease && (
                            <span className="badge badge-increase rounded-1 px-2 py-0.5 small fw-semibold">
                              +{formatPrice(a.price_change)} (+{a.price_change_percent}%)
                            </span>
                          )}
                        </div>

                        {/* Target & Predictive Status Tags */}
                        <div className="d-flex align-items-center gap-1.5 flex-wrap small">
                          <span className="text-secondary" style={{ fontSize: '0.75rem' }}>
                            Target: <strong className="text-dark">₹{formatPrice(target_price)}</strong>
                          </span>

                          {targetMet && (
                            <span className="badge bg-warning text-dark border border-warning rounded-1 px-1.5 py-0.5" style={{ fontSize: '0.65rem' }}>
                              TARGET MET
                            </span>
                          )}

                          {a.verdict === 'BUY_NOW' && (
                            <span className="badge bg-success text-white rounded-1 px-1.5 py-0.5" style={{ fontSize: '0.65rem' }}>
                              BUY NOW
                            </span>
                          )}

                          {a.verdict === 'WAIT_FOR_DROP' && (
                            <span className="badge bg-light text-muted border rounded-1 px-1.5 py-0.5" style={{ fontSize: '0.65rem' }}>
                              WAIT FOR DROP
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Product Title */}
                    <Link
                      to={`/result?url=${encodeURIComponent(product.amazon_url)}`}
                      className="text-decoration-none text-dark d-block mb-3"
                    >
                      <h6 className="card-title title-clamp small mb-0 text-dark" style={{ lineHeight: '1.45', height: '2.9em', fontWeight: '600' }}>
                        {product.title}
                      </h6>
                    </Link>

                    {/* Range Info: Low / Avg / High */}
                    <div className="d-flex justify-content-between align-items-center py-1.5 px-2 bg-light rounded-2 small text-secondary mb-3" style={{ fontSize: '0.75rem' }}>
                      <span>Low: <strong className="text-success">₹{formatPrice(a.min_price || product.current_price)}</strong></span>
                      <span className="text-muted">|</span>
                      <span>Avg: <strong className="text-dark">₹{formatPrice(a.avg_price || product.current_price)}</strong></span>
                      <span className="text-muted">|</span>
                      <span>High: <strong className="text-danger">₹{formatPrice(a.max_price || product.current_price)}</strong></span>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="d-flex justify-content-between align-items-center pt-2 border-top border-light-subtle">
                    <Link
                      to={`/result?url=${encodeURIComponent(product.amazon_url)}`}
                      className="btn btn-outline-dark btn-sm rounded-2 px-2.5 py-1 fw-medium"
                      style={{ fontSize: '0.75rem' }}
                    >
                      Price Details &rarr;
                    </Link>

                    <div className="d-flex align-items-center gap-2">
                      <a
                        href={product.amazon_url}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-warning btn-sm rounded-2 px-2.5 py-1 text-dark fw-medium"
                        style={{ fontSize: '0.75rem' }}
                      >
                        Amazon
                      </a>
                      <button
                        onClick={() => untrack(product.asin)}
                        className="btn btn-link text-secondary text-decoration-none p-0 small"
                        title="Remove"
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
        <div className="text-center py-5 border rounded-3 bg-white my-4 shadow-sm" style={{ borderColor: '#e2e8f0' }}>
          <h6 className="fw-semibold text-dark mb-1">No products found</h6>
          <p className="text-secondary small mb-3">
            {filter !== 'all' ? `No products match the selected filter.` : "You have not added any products to your watchlist yet."}
          </p>
          <Link to="/search" className="btn btn-dark btn-sm px-3 rounded-2">
            Track a Product
          </Link>
        </div>
      )}
    </div>
  );
}
