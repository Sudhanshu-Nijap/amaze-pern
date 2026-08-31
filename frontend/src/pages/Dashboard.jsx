import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { io } from 'socket.io-client';

export default function Dashboard() {
  const [trackedProducts, setTrackedProducts] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all', 'decreased', 'increased', 'target'
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

      // Connect to socket for real-time updates
      const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000');
      socket.on('dataUpdated', (data) => {
        if (data.type === 'prices') {
          console.log("Real-time update received: prices");
          fetchTracked();
        }
      });

      return () => socket.disconnect();
    }
  }, [user]);

  const untrack = async (asin) => {
    if (!window.confirm("Remove this product from your price watchlist?")) return;
    try {
      await api.delete(`/products/tracked/${asin}`);
      setTrackedProducts(prev => prev.filter(p => p.product.asin !== asin));
    } catch (err) {
      alert("Failed to remove price watch");
    }
  };

  // Compute summary metrics
  const stats = useMemo(() => {
    let totalTracked = trackedProducts.length;
    let priceDrops = 0;
    let priceIncreases = 0;
    let targetReached = 0;
    let totalSavings = 0;

    trackedProducts.forEach(item => {
      const analysis = item.price_analysis || {};
      if (analysis.trend === 'decreased') {
        priceDrops++;
        totalSavings += Math.abs(analysis.price_change || 0);
      } else if (analysis.trend === 'increased') {
        priceIncreases++;
      }
      if (analysis.target_reached) {
        targetReached++;
      }
    });

    return { totalTracked, priceDrops, priceIncreases, targetReached, totalSavings };
  }, [trackedProducts]);

  // Filter products
  const filteredProducts = useMemo(() => {
    return trackedProducts.filter(item => {
      const analysis = item.price_analysis || {};
      const matchesSearch = item.product?.title?.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!matchesSearch) return false;

      if (filter === 'decreased') return analysis.trend === 'decreased';
      if (filter === 'increased') return analysis.trend === 'increased';
      if (filter === 'target') return analysis.target_reached;
      return true;
    });
  }, [trackedProducts, filter, searchQuery]);

  return (
    <div className="container py-4">
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-2 border-bottom">
        <div>
          <h2 className="fw-bold mb-1">Price Watch & Trend Dashboard</h2>
          <p className="text-muted mb-0">Track Amazon price fluctuations, drops, and buying opportunities.</p>
        </div>
        <Link to="/search" className="btn btn-primary rounded-pill px-4 mt-2 mt-md-0 fw-semibold">
          + Track New Product
        </Link>
      </div>

      {/* Metric KPI Cards */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm rounded-4 h-100 bg-white">
            <div className="card-body p-3 d-flex align-items-center">
              <div className="p-3 rounded-circle bg-primary bg-opacity-10 text-primary me-3 fs-4">
                📦
              </div>
              <div>
                <small className="text-muted text-uppercase fw-bold" style={{ fontSize: '0.75rem' }}>Tracked</small>
                <h4 className="fw-bold mb-0">{stats.totalTracked}</h4>
              </div>
            </div>
          </div>
        </div>

        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm rounded-4 h-100 bg-white">
            <div className="card-body p-3 d-flex align-items-center">
              <div className="p-3 rounded-circle bg-success bg-opacity-10 text-success me-3 fs-4">
                📉
              </div>
              <div>
                <small className="text-muted text-uppercase fw-bold" style={{ fontSize: '0.75rem' }}>Price Drops</small>
                <h4 className="fw-bold text-success mb-0">{stats.priceDrops}</h4>
              </div>
            </div>
          </div>
        </div>

        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm rounded-4 h-100 bg-white">
            <div className="card-body p-3 d-flex align-items-center">
              <div className="p-3 rounded-circle bg-danger bg-opacity-10 text-danger me-3 fs-4">
                📈
              </div>
              <div>
                <small className="text-muted text-uppercase fw-bold" style={{ fontSize: '0.75rem' }}>Price Increases</small>
                <h4 className="fw-bold text-danger mb-0">{stats.priceIncreases}</h4>
              </div>
            </div>
          </div>
        </div>

        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm rounded-4 h-100 bg-white">
            <div className="card-body p-3 d-flex align-items-center">
              <div className="p-3 rounded-circle bg-warning bg-opacity-10 text-warning me-3 fs-4">
                🎯
              </div>
              <div>
                <small className="text-muted text-uppercase fw-bold" style={{ fontSize: '0.75rem' }}>Target Reached</small>
                <h4 className="fw-bold text-warning mb-0">{stats.targetReached}</h4>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Chips & Search Bar */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div className="btn-group rounded-pill p-1 bg-light border" role="group">
          <button
            type="button"
            className={`btn rounded-pill btn-sm px-3 fw-semibold ${filter === 'all' ? 'btn-dark' : 'btn-light'}`}
            onClick={() => setFilter('all')}
          >
            All ({stats.totalTracked})
          </button>
          <button
            type="button"
            className={`btn rounded-pill btn-sm px-3 fw-semibold ${filter === 'decreased' ? 'btn-success text-white' : 'btn-light text-success'}`}
            onClick={() => setFilter('decreased')}
          >
            📉 Price Dropped ({stats.priceDrops})
          </button>
          <button
            type="button"
            className={`btn rounded-pill btn-sm px-3 fw-semibold ${filter === 'increased' ? 'btn-danger text-white' : 'btn-light text-danger'}`}
            onClick={() => setFilter('increased')}
          >
            📈 Price Increased ({stats.priceIncreases})
          </button>
          <button
            type="button"
            className={`btn rounded-pill btn-sm px-3 fw-semibold ${filter === 'target' ? 'btn-warning text-dark' : 'btn-light text-warning'}`}
            onClick={() => setFilter('target')}
          >
            🎯 Target Met ({stats.targetReached})
          </button>
        </div>

        <div style={{ minWidth: '220px', maxWidth: '350px' }} className="flex-grow-1">
          <input
            type="text"
            className="form-control rounded-pill px-3"
            placeholder="🔍 Search watchlist..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Product Cards Grid */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status"></div>
          <p className="text-muted mt-2">Loading price trends...</p>
        </div>
      ) : filteredProducts.length > 0 ? (
        <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
          {filteredProducts.map(({ product, target_price, price_analysis }) => {
            const analysis = price_analysis || {};
            const isDrop = analysis.trend === 'decreased';
            const isIncrease = analysis.trend === 'increased';
            const targetMet = analysis.target_reached;

            return (
              <div className="col" key={product.asin}>
                <div className="card h-100 border-0 shadow-sm rounded-4 overflow-hidden position-relative">
                  {/* Top Trend Tag */}
                  <div className="position-absolute top-0 end-0 p-3" style={{ zIndex: 2 }}>
                    {isDrop && (
                      <span className="badge rounded-pill bg-success px-3 py-2 shadow-sm fs-6">
                        📉 Drop ₹{Math.abs(analysis.price_change)} ({Math.abs(analysis.price_change_percent)}%)
                      </span>
                    )}
                    {isIncrease && (
                      <span className="badge rounded-pill bg-danger px-3 py-2 shadow-sm fs-6">
                        📈 Up +₹{analysis.price_change} (+{analysis.price_change_percent}%)
                      </span>
                    )}
                    {!isDrop && !isIncrease && (
                      <span className="badge rounded-pill bg-secondary bg-opacity-75 px-3 py-2 shadow-sm">
                        ● Stable Price
                      </span>
                    )}
                  </div>

                  {/* Target Met Ribbon */}
                  {targetMet && (
                    <div className="position-absolute top-0 start-0 p-3" style={{ zIndex: 2 }}>
                      <span className="badge rounded-pill bg-warning text-dark px-3 py-2 shadow-sm fw-bold">
                        🎯 Target Met!
                      </span>
                    </div>
                  )}

                  {/* Product Image */}
                  <div className="bg-light p-4 text-center">
                    <Link to={`/result?url=${encodeURIComponent(product.amazon_url)}`}>
                      <img 
                        src={product.image_url} 
                        alt={product.title} 
                        className="img-fluid" 
                        style={{ height: '180px', objectFit: 'contain' }} 
                      />
                    </Link>
                  </div>

                  <div className="card-body d-flex flex-column justify-content-between p-4">
                    {/* Title */}
                    <div>
                      <Link 
                        to={`/result?url=${encodeURIComponent(product.amazon_url)}`} 
                        className="text-decoration-none text-dark"
                      >
                        <h6 className="card-title fw-bold title-clamp mb-3" style={{ lineHeight: '1.4' }}>
                          {product.title}
                        </h6>
                      </Link>

                      {/* Price Section */}
                      <div className="bg-light rounded-3 p-3 mb-3">
                        <div className="d-flex justify-content-between align-items-baseline mb-1">
                          <span className="text-muted small">Current Price:</span>
                          <span className={`fs-5 fw-bold ${isDrop ? 'text-success' : isIncrease ? 'text-danger' : 'text-primary'}`}>
                            ₹{product.current_price}
                          </span>
                        </div>
                        <div className="d-flex justify-content-between align-items-baseline mb-2">
                          <span className="text-muted small">Target Price:</span>
                          <span className="fw-bold text-warning-emphasis">
                            ₹{target_price}
                          </span>
                        </div>
                        {analysis.initial_price && analysis.initial_price !== product.current_price && (
                          <div className="d-flex justify-content-between align-items-baseline small text-muted pt-1 border-top">
                            <span>Initial Price:</span>
                            <span>₹{analysis.initial_price}</span>
                          </div>
                        )}
                      </div>

                      {/* Price Analysis Stats */}
                      <div className="row text-center g-1 mb-3 py-2 px-1 rounded-2 bg-body-tertiary">
                        <div className="col-4 border-end">
                          <small className="text-muted d-block" style={{ fontSize: '0.7rem' }}>Lowest</small>
                          <span className="fw-semibold text-success small">₹{analysis.min_price || product.current_price}</span>
                        </div>
                        <div className="col-4 border-end">
                          <small className="text-muted d-block" style={{ fontSize: '0.7rem' }}>Average</small>
                          <span className="fw-semibold text-secondary small">₹{analysis.avg_price || product.current_price}</span>
                        </div>
                        <div className="col-4">
                          <small className="text-muted d-block" style={{ fontSize: '0.7rem' }}>Highest</small>
                          <span className="fw-semibold text-danger small">₹{analysis.max_price || product.current_price}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-2">
                      <div className="d-flex gap-2 mb-2">
                        <Link 
                          to={`/result?url=${encodeURIComponent(product.amazon_url)}`}
                          className="btn btn-outline-primary btn-sm flex-grow-1 rounded-pill fw-semibold"
                        >
                          📊 Price History
                        </Link>
                        <a 
                          href={product.amazon_url} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="btn btn-warning btn-sm flex-grow-1 rounded-pill fw-semibold"
                        >
                          Amazon ↗
                        </a>
                      </div>

                      <button 
                        onClick={() => untrack(product.asin)}
                        className="btn btn-link text-danger text-decoration-none btn-sm w-100 text-center p-0"
                      >
                        Remove from Watchlist
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card border-0 shadow-sm rounded-4 p-5 text-center bg-white my-4">
          <div className="fs-1 mb-3">🔍</div>
          <h5 className="fw-bold mb-2">No matching tracked products</h5>
          <p className="text-muted mb-4">
            {filter !== 'all' 
              ? `No products currently match the "${filter}" price filter.`
              : "You haven't added any products to your price watchlist yet."}
          </p>
          <Link to="/search" className="btn btn-primary rounded-pill px-4 align-self-center">
            Search & Track Products
          </Link>
        </div>
      )}
    </div>
  );
}
