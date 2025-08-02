import { memo } from "react";

export const EthLogo = memo(({ className }: { className: string }) => {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M16 0C7.163 0 0 7.163 0 16C0 24.837 7.163 32 16 32C24.837 32 32 24.837 32 16C32 7.163 24.837 0 16 0Z"
        fill="#627EEA"
      />
      <path
        d="M16.498 4V12.87L23.995 16.349L16.498 4Z"
        fill="white"
        fillOpacity="0.602"
      />
      <path d="M16.498 4L9 16.349L16.498 12.87V4Z" fill="white" />
      <path
        d="M16.498 21.968V27.995L24 18.001L16.498 21.968Z"
        fill="white"
        fillOpacity="0.602"
      />
      <path d="M16.498 27.995V21.967L9 18.001L16.498 27.995Z" fill="white" />
      <path
        d="M16.498 20.573L23.995 16.349L16.498 12.87V20.573Z"
        fill="white"
        fillOpacity="0.2"
      />
      <path
        d="M9 16.349L16.498 20.573V12.87L9 16.349Z"
        fill="white"
        fillOpacity="0.602"
      />
    </svg>
  );
});
