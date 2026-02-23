import React from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, AlertTriangle, Trash2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const STORAGE_LIMIT_BYTES = 5 * 1024 * 1024; // 5MB baseline for warning threshold

interface StorageItem {
  key: string;
  size: number;
  formattedSize: string;
}

interface StorageInfo {
  bytes: number;
  percentage: number;
  formattedSize: string;
  items: StorageItem[];
}

function calculateStorageUsage(): StorageInfo {
  let totalBytes = 0;
  const items: StorageItem[] = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      const value = localStorage.getItem(key) || "";
      // UTF-16 encoding uses 2 bytes per character
      const bytes = key.length * 2 + value.length * 2;
      totalBytes += bytes;
      
      let formattedSize: string;
      if (bytes < 1024) {
        formattedSize = `${bytes} B`;
      } else if (bytes < 1024 * 1024) {
        formattedSize = `${(bytes / 1024).toFixed(1)} KB`;
      } else {
        formattedSize = `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
      }
      
      items.push({ key, size: bytes, formattedSize });
    }
  }
  
  // Sort by size descending
  items.sort((a, b) => b.size - a.size);
  
  // Format total size nicely
  let formattedSize: string;
  if (totalBytes < 1024) {
    formattedSize = `${totalBytes} B`;
  } else if (totalBytes < 1024 * 1024) {
    formattedSize = `${(totalBytes / 1024).toFixed(1)} KB`;
  } else {
    formattedSize = `${(totalBytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  
  const percentage = (totalBytes / STORAGE_LIMIT_BYTES) * 100;
  
  return {
    bytes: totalBytes,
    percentage: Math.min(percentage, 100), // Cap at 100% for display
    formattedSize,
    items
  };
}

export function StorageIndicator() {
  const navigate = useNavigate();
  const [info, setInfo] = React.useState<StorageInfo>(calculateStorageUsage());
  const [showDetails, setShowDetails] = React.useState(false);

  React.useEffect(() => {
    const updateUsage = () => setInfo(calculateStorageUsage());
    
    window.addEventListener("storage", updateUsage);
    const interval = setInterval(updateUsage, 5000);
    
    return () => {
      window.removeEventListener("storage", updateUsage);
      clearInterval(interval);
    };
  }, []);

  const isWarning = info.percentage >= 80;
  const isCritical = info.bytes >= 8 * 1024 * 1024; // 8MB is definitely critical

  const handleDeleteKey = (key: string) => {
    if (confirm(`Delete "${key}"?\n\nThis will free up space but may remove data.`)) {
      localStorage.removeItem(key);
      setInfo(calculateStorageUsage());
    }
  };

  return (
    <div className="border-t border-border/50">
      <button
        onClick={() => navigate("/tournaments")}
        className="w-full text-left group"
        title="Click to manage tournaments and archive old data"
      >
        <div className="px-2 py-2 space-y-1.5">
          <Progress
            value={info.percentage}
            className={cn(
              "h-1.5",
              isWarning && "[&>div]:bg-amber-500",
              isCritical && "[&>div]:bg-red-500"
            )}
          />
          <div className="flex items-center justify-between text-xs">
            <span
              className={cn(
                "text-muted-foreground flex items-center gap-1",
                isWarning && "text-amber-600 font-medium",
                isCritical && "text-red-600 font-bold"
              )}
            >
              {isWarning && <AlertTriangle className="h-3 w-3" />}
              Storage: {info.formattedSize}
            </span>
            <ChevronRight
              className={cn(
                "h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5",
                isWarning && "text-amber-600",
                isCritical && "text-red-600"
              )}
            />
          </div>
        </div>
      </button>
      
      {info.items.length > 0 && (
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full px-2 pb-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          {showDetails ? "Hide details ▲" : "Show storage details ▼"}
        </button>
      )}
      
      {showDetails && (
        <div className="px-2 pb-2 space-y-1 max-h-32 overflow-y-auto">
          {info.items.slice(0, 10).map((item) => (
            <div key={item.key} className="flex items-center justify-between text-[10px] group/item">
              <span className="text-muted-foreground truncate flex-1 mr-2" title={item.key}>
                {item.key.length > 30 ? item.key.substring(0, 27) + "..." : item.key}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground whitespace-nowrap">{item.formattedSize}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteKey(item.key);
                  }}
                  className="opacity-0 group-hover/item:opacity-100 text-destructive hover:text-destructive/80 transition-opacity"
                  title={`Delete ${item.key}`}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
