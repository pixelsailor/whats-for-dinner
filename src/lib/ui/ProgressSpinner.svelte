<script lang="ts">
  type SpinnerProps = {
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  };
  let { size = 'sm' }: SpinnerProps = $props();

  let pixelSize = $derived.by(() => {
    const sizes = {
      xs: 20,
      sm: 24,
      md: 24,
      lg: 32,
      xl: 40
    };
    return `${sizes[size]}px`;
  });
</script>

<span class="pxl--progress-spinner">
  <svg width={pixelSize} height={pixelSize} viewBox="0 0 100 100">
    <circle class="bg stroke-gray-50 dark:stroke-black" cx="50" cy="50" r="38" />
    <circle class="loader stroke-gray-900 dark:stroke-gray-100" cx="50" cy="50" r="38" />
  </svg>
</span>

<style>
  .bg {
    fill: none;
    stroke-width: 8px;
  }
  .loader {
    fill: none;
    stroke-width: 8px;
    stroke-dasharray: 288;
    transform-origin: 50% 50%;
    animation:
      line 5s linear infinite,
      spin 3s linear infinite;
  }

  @keyframes line {
    0% {
      stroke-dashoffset: 1152;
    }

    100% {
      stroke-dashoffset: 576;
    }
  }

  @keyframes spin {
    0% {
      transform: rotate(-90deg) translate3d(0, 0, 0);
    }

    100% {
      transform: rotate(270deg) translate3d(0, 0, 0);
    }
  }
</style>
