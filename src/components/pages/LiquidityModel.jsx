import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import RestoreIcon from '@mui/icons-material/Restore';
import { useRiskModel } from '@store';
import {
  BPS,
  generateLiquidityCurveData,
  validation,
  targetLiquidityRatioBp,
  liquidityTriggers,
  defaultLiquidityModel,
} from '@/models';
import {
  Section,
  ParameterCard,
  DescriptionCard,
  ParameterSlider,
  SimulationCard,
  ChartContainer,
  formatBp,
  formatDollarsAuto,
  FormulaLegend,
  SimulationResult,
  SmartLink,
  LineChart,
} from '@components';

export const LiquidityModel = () => {
  const theme = useTheme();
  const {
    liquidityModel,
    simulation,
    updateLiquidityModel,
    updateLiquidityTvl,
  } = useRiskModel();

  // Section 1: Liquidity Model Configuration
  const liquidityModelParams = (
    <ParameterCard
      title="Parameters"
      action={
        <Button
          size="small"
          startIcon={<RestoreIcon />}
          onClick={() => updateLiquidityModel(defaultLiquidityModel)}
          sx={{ textTransform: 'none' }}
        >
          Reset
        </Button>
      }
    >
      <ParameterSlider
        label="Min Ratio"
        value={liquidityModel.minRatioBp}
        onChange={(value) => updateLiquidityModel({ minRatioBp: value })}
        min={validation.liquidityModel.minRatioBp.min}
        max={validation.liquidityModel.minRatioBp.max}
        step={100}
        formatValue={formatBp}
        helperText="Asymptotic minimum liquidity ratio floor that larger vaults approach as TVL increases. Based on Basel III banking regulations and optimal cash holdings theory for institutional treasury management."
      />
      <ParameterSlider
        label="TVL Factor"
        value={liquidityModel.tvlFactorBp}
        onChange={(value) => updateLiquidityModel({ tvlFactorBp: value })}
        min={validation.liquidityModel.tvlFactorBp.min}
        max={validation.liquidityModel.tvlFactorBp.max}
        step={100}
        formatValue={(v) => `${(v / BPS).toFixed(2)}`}
        helperText="Linear TVL scaling sensitivity in the exponential decay formula. Higher values make vault size more influential in determining liquidity requirements, implementing scale economies from corporate finance theory."
      />
      <ParameterSlider
        label="TVL Exponent"
        value={liquidityModel.tvlExponentBp}
        onChange={(value) => updateLiquidityModel({ tvlExponentBp: value })}
        min={validation.liquidityModel.tvlExponentBp.min}
        max={validation.liquidityModel.tvlExponentBp.max}
        step={50} // 0.005 in BPS
        formatValue={(v) => `${(v / BPS).toFixed(3)}`}
        helperText="Exponential decay strength controlling how aggressively liquidity requirements decrease with vault scale. Based on Baumol-Tobin optimal cash holdings model where larger entities achieve better operational efficiency."
      />
      <ParameterSlider
        label="Low Offset"
        value={liquidityModel.lowOffsetBp}
        onChange={(value) => updateLiquidityModel({ lowOffsetBp: value })}
        min={validation.liquidityModel.lowOffsetBp.min}
        max={validation.liquidityModel.lowOffsetBp.max}
        step={100}
        formatValue={formatBp}
        helperText="Low liquidity trigger offset percentage below target ratio. When current ratio falls below this threshold, protocol automatically unwinds LP positions to restore liquidity buffer levels."
      />
      <ParameterSlider
        label="High Offset"
        value={liquidityModel.highOffsetBp}
        onChange={(value) => updateLiquidityModel({ highOffsetBp: value })}
        min={validation.liquidityModel.highOffsetBp.min}
        max={validation.liquidityModel.highOffsetBp.max}
        step={100}
        formatValue={formatBp}
        helperText="High liquidity trigger offset percentage above target ratio. When current ratio exceeds this threshold, protocol automatically deploys excess liquidity into LP positions for yield generation."
      />
    </ParameterCard>
  );

  const liquidityModelDescription = (
    <DescriptionCard
      title="Methodology"
      formula="r = b + (1-b) * (1 + T * f)^{-e}"
    >
      <Typography variant="body2" paragraph>
        <strong>Theoretical foundation</strong>: Implements{' '}
        <strong>optimal cash holdings theory</strong> from corporate finance and{' '}
        <strong>inventory management models</strong> from operations research.
        The exponential decay function follows{' '}
        <strong>Baumol-Tobin model</strong> principles, where transaction costs
        and liquidity needs don't scale linearly with vault size, creating
        economies of scale. Cash reserves are maintained not because underlying
        assets lack liquidity or high quality (HQLA), but for optimization
        purposes (gas savings at scale) and enhanced security (buffer against
        major liquidation events without slippage).
      </Typography>
      <Typography variant="body2" paragraph>
        <strong>Core methodology</strong>: Dynamic liquidity buffer system using
        exponential decay based on vault TVL. Larger vaults operate with
        proportionally lower buffer ratios, while smaller vaults maintain higher
        ratios for operational stability. The formula balances{' '}
        <strong>capital efficiency</strong> against{' '}
        <strong>operational requirements</strong> through mathematically proven
        scaling relationships. Buffer allocation integrates with{' '}
        <SmartLink to="/allocation">BTR's Allocation Model</SmartLink> for
        optimal capital deployment.
      </Typography>
      <Typography variant="body2" paragraph>
        <strong>Practical advantages</strong>: Enables batch processing of DEX
        interactions, flow netting to reduce rebalancing frequency, and
        asynchronous market making across diverse protocols. Users interact only
        with vault contracts avoiding direct DEX gas costs, while protocol
        routines handle batch liquidity operations creating 90%+ gas savings per
        user transaction. Transaction timing optimization uses{' '}
        <SmartLink to="/slippage">BTR's Slippage Model</SmartLink> to minimize
        market impact.
      </Typography>
      <Typography variant="body2">
        <strong>Mathematical implementation</strong>: Exponential decay function
        with configurable minimum ratio, TVL scaling factor, and decay exponent.
        Buffer liquidity generates yield through Cash Strategy integration with
        money markets (AAVE, Compound) while maintaining instant redemption
        capability, eliminating traditional cash drag.
      </Typography>
      <FormulaLegend
        items={[
          { symbol: '<em>r</em>', text: 'target ratio' },
          { symbol: '<em>b</em>', text: 'min ratio' },
          { symbol: '<em>T</em>', text: 'vault TVL' },
          { symbol: '<em>f</em>', text: 'TVL factor' },
          { symbol: '<em>e</em>', text: 'exponent' },
        ]}
      />
    </DescriptionCard>
  );

  // Section 2: Liquidity Buffer Simulation
  const maxTvlForChart = 1000000000; // $1B for chart scale to match slider
  const liquidityCurveData = generateLiquidityCurveData(
    liquidityModel,
    maxTvlForChart,
    100,
    true
  );

  const currentTargetRatio = targetLiquidityRatioBp(
    simulation.liquidityTvl,
    liquidityModel.minRatioBp,
    liquidityModel.tvlFactorBp,
    liquidityModel.tvlExponentBp
  );
  const currentTriggers = liquidityTriggers(
    currentTargetRatio,
    liquidityModel.lowOffsetBp,
    liquidityModel.highOffsetBp
  );

  const liquidityBufferDescription = (
    <DescriptionCard
      title="Methodology"
      formula="{| t_l = r * (1-o_l);; t_h = r * (1+o_h)::|"
    >
      <Typography variant="body2" paragraph>
        <strong>Theoretical foundation</strong>: The dual-threshold system
        implements <strong>control theory</strong> and{' '}
        <strong>hysteresis mechanisms</strong> from engineering systems.
        Prevents oscillation around target ratios while enabling optimal{' '}
        <strong>flow netting</strong> where simultaneous deposits and
        withdrawals cancel out within operational bounds, based on queuing
        theory principles.
      </Typography>
      <Typography variant="body2" paragraph>
        <strong>Core methodology</strong>: Low trigger initiates strategic LP
        unwinding in optimal batch sizes, while high trigger deploys excess
        capital during favorable market conditions. This asynchronous approach
        enables market making in illiquid DEXs and cross-chain protocols that
        would be impractical for real-time operations.
      </Typography>
      <Typography variant="body2" paragraph>
        <strong>Practical examples</strong>: Traditional approach costs $50-200
        per user transaction; BTR buffer reduces this to $2-5 through gas
        amortization. Cash Strategy integration generates 3-5% APY through money
        market deployment (AAVE, Compound) while maintaining instant redemption
        capability, eliminating traditional cash drag.
      </Typography>
      <Typography variant="body2">
        <strong>Mathematical implementation</strong>: Dual-threshold calculation
        with configurable offset percentages. System eliminates unnecessary DEX
        interactions and reduces gas costs by 80%+ through trigger-based
        batching, converting continuous rebalancing to event-driven operations.
      </Typography>
      <FormulaLegend
        items={[
          { symbol: '<em>t<sub>l</sub></em>', text: 'low trigger threshold' },
          { symbol: '<em>t<sub>h</sub></em>', text: 'high trigger threshold' },
          { symbol: '<em>r</em>', text: 'target ratio' },
          { symbol: '<em>o<sub>l</sub></em>', text: 'low offset' },
          { symbol: '<em>o<sub>h</sub></em>', text: 'high offset' },
        ]}
      />
    </DescriptionCard>
  );

  const liquidityChart = (
    <SimulationCard
      title="Simulation"
      action={
        <Button
          size="small"
          startIcon={<RestoreIcon />}
          onClick={() => updateLiquidityTvl(1000000)}
          sx={{ textTransform: 'none' }}
        >
          Reset
        </Button>
      }
      controls={
        <Box>
          <ParameterSlider
            label="Current Vault TVL (USD)"
            value={simulation.liquidityTvl}
            onChange={updateLiquidityTvl}
            min={1000}
            max={1000000000}
            formatValue={(v) => formatDollarsAuto(v, 0)}
            helperText="Total value locked in vault determining liquidity buffer requirements through exponential decay formula. Demonstrates how larger vaults achieve operational efficiency with proportionally lower buffer ratios."
            logarithmic={true}
            color="secondary"
          />
          <SimulationResult
            prefix={`For TVL = ${formatDollarsAuto(simulation.liquidityTvl)}:`}
            values={[
              {
                key: 'low',
                label: 'Low',
                value: formatBp(currentTriggers.lowTrigger),
              },
              {
                key: 'target',
                label: 'Target',
                value: formatBp(currentTargetRatio),
              },
              {
                key: 'high',
                label: 'High',
                value: formatBp(currentTriggers.highTrigger),
              },
            ]}
            highlighted="target"
            colors={{
              low: theme.palette.warning.main, // Orange for consistency
              target: theme.palette.primary.main,
              high: theme.palette.warning.main, // Orange for consistency
            }}
          />
        </Box>
      }
    >
      <ChartContainer>
        <LineChart
          height={600}
          data={{
            labels: liquidityCurveData.map((d) => d.tvl), // Use raw TVL values instead of formatted strings
            datasets: [
              {
                label: 'Low Trigger (%)',
                data: liquidityCurveData.map((d) => d.low),
                borderColor: theme.palette.warning.main, // Orange color
                backgroundColor: `${theme.palette.warning.main}20`,
                borderDash: [8, 4], // Dashed line pattern
                tension: 0.4, // Smooth curve
                fill: false,
                pointRadius: 0, // No data points by default
                pointHoverRadius: 6, // Show on hover
                borderWidth: 2,
              },
              {
                label: 'Target Ratio (%)',
                data: liquidityCurveData.map((d) => d.target),
                borderColor: theme.palette.primary.main,
                backgroundColor: `${theme.palette.primary.main}20`,
                tension: 0.4, // Smooth curve
                fill: false,
                pointRadius: 0, // No data points by default
                pointHoverRadius: 6, // Show on hover
                borderWidth: 2,
              },
              {
                label: 'High Trigger (%)',
                data: liquidityCurveData.map((d) => d.high),
                borderColor: theme.palette.warning.main, // Orange color
                backgroundColor: `${theme.palette.warning.main}20`,
                borderDash: [8, 4], // Dashed line pattern
                tension: 0.4, // Smooth curve
                fill: false,
                pointRadius: 0, // No data points by default
                pointHoverRadius: 6, // Show on hover
                borderWidth: 2,
              },
            ],
          }}
          options={{
            scales: {
              x: {
                type: 'logarithmic',
                title: {
                  display: true,
                  text: 'Vault TVL (USD)',
                },
                ticks: {
                  maxRotation: 0, // No rotation for x-axis labels
                  minRotation: 0,
                  maxTicksLimit: 8, // Limit number of ticks for automatic spacing
                  callback: function (value) {
                    return formatDollarsAuto(value); // Use auto dollar formatter
                  },
                },
              },
              y: {
                min: 0,
                max: 50,
                display: true, // Make y-axis visible
                title: {
                  display: true,
                  text: 'Liquidity Ratio (%)',
                },
              },
            },
            plugins: {
              legend: {
                display: true,
                position: 'top',
              },
              tooltip: {
                callbacks: {
                  title: function (context) {
                    return `TVL: ${formatDollarsAuto(context[0].parsed.x)}`;
                  },
                },
              },
            },
          }}
          referenceLines={[
            {
              x: simulation.liquidityTvl,
              label: `${formatDollarsAuto(simulation.liquidityTvl)}`,
              lineStyle: {
                stroke: theme.palette.secondary.main, // Use green for current TVL reference
                strokeDasharray: '4 3',
                strokeWidth: 2,
              },
              labelStyle: {
                fontSize: '12px',
                fill: theme.palette.secondary.main,
              },
            },
          ]}
        />
      </ChartContainer>
    </SimulationCard>
  );

  return (
    <Box>
      <Section title="Liquidity Model" id="liquidity-model-section">
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          <Box sx={{ flex: '1 1 45%', minWidth: '300px' }}>
            {liquidityModelDescription}
          </Box>
          <Box sx={{ flex: '1 1 45%', minWidth: '300px' }}>
            {liquidityModelParams}
          </Box>
        </Box>
      </Section>

      <Section title="Liquidity Buffer" id="buffer-simulation-section">
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          <Box sx={{ flex: '1 1 45%', minWidth: '300px' }}>
            {liquidityBufferDescription}
          </Box>
          <Box sx={{ flex: '1 1 45%', minWidth: '300px' }}>
            {liquidityChart}
          </Box>
        </Box>
      </Section>
    </Box>
  );
};

export default LiquidityModel;
