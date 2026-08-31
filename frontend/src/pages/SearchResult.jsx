import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';

export default function SearchResult() {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const location = useLocation();

  const getNumericPrice = (val) => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const cleaned = String(val).replace(/,/g, '').replace(/[^0-9.]/g, '').replace(/\.$/, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  const formatPrice = (val) => {
    const num = getNumericPrice(val);
    if (!num) return "0";
    return num.toLocaleString('en-IN', { maximumFractionDigits: 2 });
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const url = params.get('url');

    if (url) {
      if (location.pathname === '/search') {
        handleSearch(url);
      } else {
        handleResult(url);
      }
    }
  }, [location.pathname, location.search]);

  const handleSearch = async (url) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/products/search', { url });
      setProduct(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch product details.');
    } finally {
      setLoading(false);
    }
  };

  const handleResult = async (url) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/products/result?url=${encodeURIComponent(url)}`);
      setProduct(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch product details.');
    } finally {
      setLoading(false);
    }
  };

  const applyDiscount = (percent) => {
    const price = getNumericPrice(product?.current_price);
    if (price > 0) {
      if (percent === 0.01) {
        // Any Price Drop: ₹1 below current price
        setTargetPrice(Math.max(1, price - 1).toFixed(2));
      } else {
        const discounted = price - (price * percent) / 100;
        setTargetPrice(discounted.toFixed(2));
      }
    }
  };

  const handleTrack = async () => {
    const cleanTarget = getNumericPrice(targetPrice);
    if (cleanTarget <= 0) {
      alert("Please enter a valid desired price");
      return;
    }
    const cleanCurrent = getNumericPrice(product.current_price);

    try {
      const payload = {
        asin: product.asin,
        title: product.title,
        image_url: product.image_url,
        amazon_url: product.amazon_url || product.url,
        rating: product.rating,
        stock_status: product.stock_status,
        desired_price: cleanTarget,
        current_price: cleanCurrent
      };
      await api.post('/products/track', payload);
      alert('✅ Product successfully added to your watchlist!');
    } catch (err) {
      alert('Failed to add price watch. Please make sure you are logged in.');
    }
  };

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-primary" role="status"></div>
        <h4 className="fw-bold mt-3">Analyzing Amazon Product & Price Trends...</h4>
        <p className="text-muted">Fetching live prices and historical data</p>
      </div>
    );
  }

  const analysis = product?.price_analysis || {};

  return (
    <div className="container py-4">
      {error ? (
        <div className="alert alert-danger text-center rounded-4 shadow-sm p-4 my-4">
          <h5 className="fw-bold">Unable to Load Product</h5>
          <p className="mb-0">{error}</p>
        </div>
      ) : product ? (
        <>
          {/* Header */}
          <div className="mb-4">
            <h4 className="fw-bold text-dark mb-2" style={{ lineHeight: '1.4' }}>
              {product.title}
            </h4>
            <div className="d-flex flex-wrap gap-2 align-items-center">
              <span className="badge bg-warning text-dark px-3 py-2 rounded-pill fw-bold">
                ⭐ {product.rating || "No rating"}
              </span>
              <span className={`badge ${product.stock_status === 'In Stock' ? 'bg-success' : 'bg-danger'} px-3 py-2 rounded-pill`}>
                {product.stock_status || "Check Amazon"}
              </span>
              {product.asin && (
                <span className="badge bg-light text-muted border px-3 py-2 rounded-pill">
                  ASIN: {product.asin}
                </span>
              )}
            </div>
          </div>

          <div className="row g-4">
            {/* Left Column: Image & Price Analysis */}
            <div className="col-lg-7">
              {/* Product Image Card */}
              <div className="card border-0 shadow-sm rounded-4 p-4 text-center bg-white mb-4">
                <img 
                  src={product.image_url} 
                  alt={product.title} 
                  className="img-fluid mx-auto"
                  style={{ maxHeight: '320px', objectFit: 'contain' }} 
                />
              </div>

              {/* Price Trend & Buying Advice Card */}
              {analysis && (analysis.min_price || analysis.avg_price) && (
                <div className="card border-0 shadow-sm rounded-4 p-4 bg-white mb-4">
                  <h5 className="fw-bold mb-3 d-flex align-items-center">
                    <span className="me-2">📊</span> Price Analysis & Trend Insights
                  </h5>

                  {/* Recommendation Banner */}
                  {analysis.deal_advice === 'BEST_PRICE' && (
                    <div className="alert alert-success border-0 rounded-3 d-flex align-items-center mb-3">
                      <span className="fs-3 me-3">🔥</span>
                      <div>
                        <strong>All-Time Low Price!</strong>
                        <div className="small">The product is currently at or near its lowest recorded price. Great time to buy!</div>
                      </div>
                    </div>
                  )}

                  {analysis.deal_advice === 'BELOW_AVERAGE' && (
                    <div className="alert alert-info border-0 rounded-3 d-flex align-items-center mb-3">
                      <span className="fs-3 me-3">👍</span>
                      <div>
                        <strong>Good Value Deal</strong>
                        <div className="small">The current price (₹{formatPrice(product.current_price)}) is below the historical average of ₹{formatPrice(analysis.avg_price)}.</div>
                      </div>
                    </div>
                  )}

                  {analysis.deal_advice === 'ABOVE_AVERAGE' && (
                    <div className="alert alert-warning border-0 rounded-3 d-flex align-items-center mb-3">
                      <span className="fs-3 me-3">⚠️</span>
                      <div>
                        <strong>Price is Higher than Usual</strong>
                        <div className="small">Current price is above the historical average (₹{formatPrice(analysis.avg_price)}). Set a price watch to get notified when it drops.</div>
                      </div>
                    </div>
                  )}

                  {/* 3 Metric Cards */}
                  <div className="row text-center g-3 mt-1">
                    <div className="col-4">
                      <div className="p-3 bg-light rounded-3">
                        <small className="text-muted d-block text-uppercase fw-bold" style={{ fontSize: '0.7rem' }}>All-Time Low</small>
                        <span className="fs-5 fw-bold text-success">₹{formatPrice(analysis.min_price)}</span>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="p-3 bg-light rounded-3">
                        <small className="text-muted d-block text-uppercase fw-bold" style={{ fontSize: '0.7rem' }}>Average Price</small>
                        <span className="fs-5 fw-bold text-secondary">₹{formatPrice(analysis.avg_price)}</span>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="p-3 bg-light rounded-3">
                        <small className="text-muted d-block text-uppercase fw-bold" style={{ fontSize: '0.7rem' }}>All-Time High</small>
                        <span className="fs-5 fw-bold text-danger">₹{formatPrice(analysis.max_price)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Price History Table */}
              {product.price_history && product.price_history.length > 0 && (
                <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
                  <h5 className="fw-bold mb-3 d-flex align-items-center">
                    <span className="me-2">📅</span> Price Change History
                  </h5>
                  <div className="table-responsive">
                    <table className="table table-hover align-middle text-center mb-0">
                      <thead className="table-light">
                        <tr>
                          <th className="py-2">Date Recorded</th>
                          <th className="py-2">Recorded Price</th>
                          <th className="py-2">Comparison</th>
                        </tr>
                      </thead>
                      <tbody>
                        {product.price_history.map((entry, index) => {
                          const entryPrice = getNumericPrice(entry.price);
                          const currentPrice = getNumericPrice(product.current_price);
                          const diff = currentPrice - entryPrice;

                          return (
                            <tr key={entry.id || index}>
                              <td className="text-muted">{new Date(entry.timestamp).toLocaleDateString()}</td>
                              <td className="fw-bold text-dark">₹{formatPrice(entryPrice)}</td>
                              <td>
                                {diff < -0.01 ? (
                                  <span className="badge bg-success bg-opacity-10 text-success rounded-pill px-2 py-1">
                                    ▼ ₹{formatPrice(Math.abs(diff))} cheaper now
                                  </span>
                                ) : diff > 0.01 ? (
                                  <span className="badge bg-danger bg-opacity-10 text-danger rounded-pill px-2 py-1">
                                    ▲ ₹{formatPrice(diff)} higher now
                                  </span>
                                ) : (
                                  <span className="badge bg-secondary bg-opacity-10 text-secondary rounded-pill px-2 py-1">
                                    ● Current
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Price Watch & Actions */}
            <div className="col-lg-5">
              <div className="card border-0 shadow-sm rounded-4 p-4 bg-white sticky-top" style={{ top: '2rem' }}>
                <div className="text-center pb-3 border-bottom">
                  <small className="text-muted text-uppercase fw-bold">Live Amazon Price</small>
                  <h2 className="fw-bold text-success mt-1 mb-0">₹{formatPrice(product.current_price)}</h2>
                </div>

                <div className="py-3">
                  <a 
                    href={product.amazon_url || product.url} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="btn btn-warning w-100 rounded-pill py-2 fw-bold mb-3 shadow-sm"
                  >
                    View Product on Amazon ↗
                  </a>
                </div>

                {/* Price Alert Form */}
                <div className="p-3 bg-light rounded-4 border">
                  <h6 className="fw-bold mb-1">Set Price Drop Alert</h6>
                  <p className="text-muted small mb-3">
                    We will track this product and notify you instantly when the price drops to your target.
                  </p>

                  <label className="form-label small fw-bold text-muted">Target Price (₹)</label>
                  <div className="input-group mb-3">
                    <span className="input-group-text bg-white border-end-0 rounded-start-pill">₹</span>
                    <input 
                      type="number" 
                      className="form-control border-start-0 rounded-end-pill" 
                      placeholder="e.g. 75000" 
                      value={targetPrice}
                      onChange={(e) => setTargetPrice(e.target.value)}
                    />
                  </div>

                  {/* Quick Discount Presets */}
                  <div className="d-flex gap-2 flex-wrap justify-content-center mb-3">
                    <button type="button" onClick={() => applyDiscount(3)} className="btn btn-outline-secondary btn-sm rounded-pill px-3">-3%</button>
                    <button type="button" onClick={() => applyDiscount(5)} className="btn btn-outline-secondary btn-sm rounded-pill px-3">-5%</button>
                    <button type="button" onClick={() => applyDiscount(10)} className="btn btn-outline-secondary btn-sm rounded-pill px-3">-10%</button>
                    <button type="button" onClick={() => applyDiscount(15)} className="btn btn-outline-secondary btn-sm rounded-pill px-3">-15%</button>
                    <button type="button" onClick={() => applyDiscount(0.01)} className="btn btn-outline-success btn-sm rounded-pill px-3">Any Drop</button>
                  </div>

                  <button 
                    onClick={handleTrack} 
                    className="btn btn-primary w-100 rounded-pill py-2 fw-bold shadow-sm"
                  >
                    🔔 Add to Watchlist
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-5">
          <div className="fs-1 mb-3">🔍</div>
          <h4 className="fw-bold mb-2">Search Amazon Products</h4>
          <p className="text-muted">Paste an Amazon URL or ASIN above to view price analysis and history.</p>
        </div>
      )}
    </div>
  );
}
