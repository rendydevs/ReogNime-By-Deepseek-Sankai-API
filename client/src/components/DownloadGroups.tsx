import { ExternalLink } from 'lucide-react';
import type { OtakuDownloadGroup } from '../types';

export function DownloadGroups({ groups, emptyLabel = 'Tautan unduhan belum tersedia.' }: { groups: OtakuDownloadGroup[]; emptyLabel?: string }) {
  if (!groups.length) return <p className="download-empty">{emptyLabel}</p>;

  return (
    <div className="download-groups">
      {groups.map((group, groupIndex) => (
        <div className="download-group" key={`${group.format}-${groupIndex}`}>
          {groups.length > 1 && <h4>{group.format}</h4>}
          {group.qualities.map((quality) => (
            <div className="download-row" key={`${quality.quality}-${quality.size ?? ''}`}>
              <div className="download-quality">
                <strong>{quality.quality}</strong>
                {quality.size && <span>{quality.size}</span>}
              </div>
              <div className="download-links">
                {quality.urls.map((mirror) => (
                  <a
                    key={`${mirror.name}-${mirror.url}`}
                    href={mirror.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {mirror.name}
                    <ExternalLink size={11} />
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
