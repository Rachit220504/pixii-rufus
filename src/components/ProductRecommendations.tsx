"use client";

import { Star, TrendingUp, DollarSign, Award, Check, ExternalLink } from "lucide-react";
import type { QueryResult, ProductDisplay, TopPick } from "@/types/index";

interface ProductRecommendationsProps {
  result: QueryResult;
}

export function ProductRecommendations({ result }: ProductRecommendationsProps) {
  const { products, topRated, bestValue, editorsChoice, summary, totalProducts, totalReviews, averagePrice } = result;

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-lg font-bold text-gray-900">AI Shopping Recommendations</h2>
        <p className="text-sm text-gray-500">
          {totalProducts} products • {totalReviews} reviews analyzed • ₹{averagePrice} avg price
          {result.cached && <span className="ml-2 text-blue-500">(cached)</span>}
        </p>
        {summary && (
          <p className="text-sm text-gray-700 mt-2 bg-gray-50 p-2 rounded">{summary}</p>
        )}
      </div>

      {/* Top Picks */}
      <div className="space-y-4">
        {topRated && (
          <TopPickCard
            product={topRated}
            icon={<Star className="w-4 h-4" />}
            label="Top Rated"
            color="yellow"
          />
        )}
        
        {bestValue && bestValue.asin !== topRated?.asin && (
          <TopPickCard
            product={bestValue}
            icon={<DollarSign className="w-4 h-4" />}
            label="Best Value"
            color="green"
          />
        )}
        
        {editorsChoice && editorsChoice.asin !== topRated?.asin && editorsChoice.asin !== bestValue?.asin && (
          <TopPickCard
            product={editorsChoice}
            icon={<Award className="w-4 h-4" />}
            label="Editor's Choice"
            color="purple"
          />
        )}
      </div>

      {/* All Products */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">All Products</h3>
        <div className="space-y-3">
          {products.map((product) => (
            <ProductCard key={product.asin} product={product} />
          ))}
        </div>
      </div>
    </div>
  );
}

function TopPickCard({
  product,
  icon,
  label,
  color,
}: {
  product: TopPick;
  icon: React.ReactNode;
  label: string;
  color: "yellow" | "green" | "purple";
}) {
  const colorClasses = {
    yellow: "bg-yellow-50 border-yellow-200",
    green: "bg-green-50 border-green-200",
    purple: "bg-purple-50 border-purple-200",
  };

  const badgeClasses = {
    yellow: "bg-yellow-400 text-yellow-900",
    green: "bg-green-400 text-green-900",
    purple: "bg-purple-400 text-purple-900",
  };

  return (
    <div className={`${colorClasses[color]} rounded-lg border p-4`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`px-2 py-0.5 rounded text-xs font-bold ${badgeClasses[color]}`}>
          {label}
        </div>
        <span className="text-sm font-medium text-gray-600 flex items-center gap-1">
          {icon}
        </span>
      </div>
      
      <h3 className="font-bold text-gray-900 mb-1">{product.title}</h3>
      
      <div className="flex items-center gap-3 mb-2">
        <span className="text-lg font-bold text-amazon-dark">
          {product.price !== null ? `₹${product.price.toLocaleString()}` : "Currently unavailable"}
        </span>
        <div className="flex items-center gap-1">
          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
          <span className="text-sm font-medium">{product.rating}</span>
        </div>
      </div>
      
      <p className="text-sm text-gray-700 mb-3">{product.reason}</p>
      
      {product.url && (
        <a
          href={product.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-amazon-blue hover:text-amazon-dark font-medium"
        >
          <ExternalLink className="w-4 h-4" />
          View on Amazon
        </a>
      )}
    </div>
  );
}

function ProductCard({ product }: { product: ProductDisplay }) {
  const hasValidUrl = product.url && 
    product.url !== 'https://amazon.com' &&
    product.url.startsWith('https://www.amazon.');

  return (
    <div className="product-card">
      <div className="flex items-start gap-3">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.title}
            className="w-16 h-16 object-cover rounded-lg flex-shrink-0 bg-gray-100"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="w-16 h-16 rounded-lg flex-shrink-0 bg-gray-200 flex items-center justify-center">
            <span className="text-xs text-gray-400">No image</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <h4 className="font-medium text-gray-900 text-sm line-clamp-2 flex-1">
              {product.title}
            </h4>
            {product.tag && (
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                product.tag === 'Top Rated' ? 'bg-yellow-100 text-yellow-800' :
                product.tag === 'Best Value' ? 'bg-green-100 text-green-800' :
                'bg-purple-100 text-purple-800'
              }`}>
                {product.tag}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="font-bold text-amazon-dark">{product.price !== null ? `₹${product.price.toLocaleString()}` : "Currently unavailable"}</span>
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
              {product.rating}
            </span>
            <span className="text-xs text-gray-400">
              ({product.reviewCount.toLocaleString()} reviews)
            </span>
          </div>
          <p className="text-xs text-gray-600 mt-2 line-clamp-2">{product.reason}</p>
          
          {product.insights.pros.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {product.insights.pros.slice(0, 2).map((pro, idx) => (
                <span key={idx} className="text-xs bg-green-50 text-green-700 px-1.5 py-0.5 rounded">
                  ✓ {pro}
                </span>
              ))}
              {product.insights.cons.slice(0, 1).map((con, idx) => (
                <span key={idx} className="text-xs bg-red-50 text-red-700 px-1.5 py-0.5 rounded">
                  ✗ {con}
                </span>
              ))}
            </div>
          )}
        </div>
        {hasValidUrl ? (
          <a
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 text-amazon-blue hover:text-amazon-dark"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        ) : (
          <span className="flex-shrink-0 text-gray-400 text-xs">
            -
          </span>
        )}
      </div>
    </div>
  );
}
