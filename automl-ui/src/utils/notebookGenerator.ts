import type { DataProfile } from '../types/profiling'

interface TransformConfig {
  column: string
  type: 'fillna' | 'scale' | 'encode' | 'drop' | 'log' | 'clip'
}

export function generateEDANotebook(
  selectedFile: { path: string; name: string },
  profile: DataProfile,
  transforms: TransformConfig[]
): Record<string, unknown> {
  const cells = []

  cells.push({
    cell_type: 'markdown',
    metadata: {},
    source: [
      `# Exploratory Data Analysis\n`,
      `\n`,
      `**File:** ${selectedFile.name}\n`,
      `**Generated:** ${new Date().toISOString()}\n`,
    ],
  })

  cells.push({
    cell_type: 'code',
    metadata: {},
    source: [
      'import pandas as pd\n',
      'import numpy as np\n',
      'import matplotlib.pyplot as plt\n',
      'import seaborn as sns\n',
      '\n',
      'plt.style.use("seaborn-v0_8-whitegrid")\n',
      'sns.set_palette("husl")\n',
      '%matplotlib inline\n',
    ],
    execution_count: null,
    outputs: [],
  })

  const loadCode = selectedFile.path.endsWith('.parquet')
    ? `df = pd.read_parquet("${selectedFile.path}")`
    : `df = pd.read_csv("${selectedFile.path}")`

  cells.push({
    cell_type: 'code',
    metadata: {},
    source: ['# Load dataset\n', loadCode + '\n', 'print(f"Dataset shape: {df.shape}")\n', 'df.head(10)\n'],
    execution_count: null,
    outputs: [],
  })

  cells.push({ cell_type: 'markdown', metadata: {}, source: ['## Dataset Overview\n'] })
  cells.push({
    cell_type: 'code',
    metadata: {},
    source: ['df.info()\n', 'print("\\n")\n', 'df.describe(include="all").T\n'],
    execution_count: null,
    outputs: [],
  })

  cells.push({ cell_type: 'markdown', metadata: {}, source: ['## Missing Values\n'] })
  cells.push({
    cell_type: 'code',
    metadata: {},
    source: [
      'missing = df.isnull().sum()\n',
      'missing_pct = (missing / len(df) * 100).round(2)\n',
      'missing_df = pd.DataFrame({"Count": missing, "Percentage": missing_pct})\n',
      'missing_df = missing_df[missing_df["Count"] > 0].sort_values("Count", ascending=False)\n',
      '\n',
      'if len(missing_df) > 0:\n',
      '    display(missing_df)\n',
      '    plt.figure(figsize=(10, 5))\n',
      '    missing_df["Percentage"].plot(kind="bar", color="#7C3AED")\n',
      '    plt.title("Missing Values by Column")\n',
      '    plt.xlabel("Column")\n',
      '    plt.ylabel("Missing %")\n',
      '    plt.xticks(rotation=45, ha="right")\n',
      '    plt.tight_layout()\n',
      '    plt.show()\n',
      'else:\n',
      '    print("No missing values!")\n',
    ],
    execution_count: null,
    outputs: [],
  })

  const numericCols = profile.columns.filter(c => ['numeric', 'integer', 'float'].includes(c.dtype)).slice(0, 6).map(c => c.name)

  if (numericCols.length > 0) {
    cells.push({ cell_type: 'markdown', metadata: {}, source: ['## Distributions\n'] })
    cells.push({
      cell_type: 'code',
      metadata: {},
      source: [
        `numeric_cols = ${JSON.stringify(numericCols)}\n`,
        'fig, axes = plt.subplots(2, 3, figsize=(14, 8))\n',
        'axes = axes.flatten()\n',
        'for i, col in enumerate(numeric_cols[:6]):\n',
        '    if i < len(axes):\n',
        '        df[col].hist(bins=30, ax=axes[i], color="#7C3AED", edgecolor="white")\n',
        '        axes[i].set_title(col)\n',
        '        axes[i].set_xlabel("Value")\n',
        '        axes[i].set_ylabel("Frequency")\n',
        'plt.tight_layout()\n',
        'plt.show()\n',
      ],
      execution_count: null,
      outputs: [],
    })
  }

  cells.push({ cell_type: 'markdown', metadata: {}, source: ['## Correlations\n'] })
  cells.push({
    cell_type: 'code',
    metadata: {},
    source: [
      'numeric_df = df.select_dtypes(include=[np.number])\n',
      'if len(numeric_df.columns) >= 2:\n',
      '    corr = numeric_df.corr()\n',
      '    plt.figure(figsize=(12, 10))\n',
      '    mask = np.triu(np.ones_like(corr, dtype=bool))\n',
      '    sns.heatmap(corr, mask=mask, annot=True, fmt=".2f", cmap="RdBu_r", center=0, square=True)\n',
      '    plt.title("Correlation Matrix")\n',
      '    plt.tight_layout()\n',
      '    plt.show()\n',
    ],
    execution_count: null,
    outputs: [],
  })

  if (transforms.length > 0) {
    cells.push({ cell_type: 'markdown', metadata: {}, source: ['## Data Transformations\n'] })

    const transformCode: string[] = ['df_transformed = df.copy()\n', '\n']
    const transformTypeLabels: Record<string, string> = {
      fillna: 'Fill Missing Values',
      scale: 'Standardize/Scale',
      encode: 'One-Hot Encode',
      log: 'Log Transform',
      clip: 'Clip Outliers',
      drop: 'Drop Column',
    }

    transforms.forEach((t, idx) => {
      transformCode.push(`# ${idx + 1}. ${transformTypeLabels[t.type]} on ${t.column}\n`)
      switch (t.type) {
        case 'fillna':
          transformCode.push(`if df_transformed["${t.column}"].dtype in [np.float64, np.int64]:\n`)
          transformCode.push(`    df_transformed["${t.column}"].fillna(df_transformed["${t.column}"].median(), inplace=True)\n`)
          transformCode.push(`else:\n`)
          transformCode.push(`    df_transformed["${t.column}"].fillna(df_transformed["${t.column}"].mode()[0], inplace=True)\n`)
          break
        case 'scale':
          transformCode.push(`from sklearn.preprocessing import StandardScaler\n`)
          transformCode.push(`scaler = StandardScaler()\n`)
          transformCode.push(`df_transformed["${t.column}_scaled"] = scaler.fit_transform(df_transformed[["${t.column}"]])\n`)
          break
        case 'encode':
          transformCode.push(`df_transformed = pd.get_dummies(df_transformed, columns=["${t.column}"], prefix="${t.column}")\n`)
          break
        case 'log':
          transformCode.push(`df_transformed["${t.column}_log"] = np.log1p(df_transformed["${t.column}"].clip(lower=0))\n`)
          break
        case 'clip':
          transformCode.push(`lower = df_transformed["${t.column}"].quantile(0.01)\n`)
          transformCode.push(`upper = df_transformed["${t.column}"].quantile(0.99)\n`)
          transformCode.push(`df_transformed["${t.column}"] = df_transformed["${t.column}"].clip(lower, upper)\n`)
          break
        case 'drop':
          transformCode.push(`df_transformed.drop(columns=["${t.column}"], inplace=True)\n`)
          break
      }
      transformCode.push('\n')
    })

    transformCode.push('print(f"Transformed shape: {df_transformed.shape}")\n')
    transformCode.push('df_transformed.head()\n')

    cells.push({ cell_type: 'code', metadata: {}, source: transformCode, execution_count: null, outputs: [] })

    cells.push({
      cell_type: 'code',
      metadata: {},
      source: [
        `output_path = "${selectedFile.path.replace(/\.[^.]+$/, '_transformed.csv')}"\n`,
        'df_transformed.to_csv(output_path, index=False)\n',
        'print(f"Saved to: {output_path}")\n',
      ],
      execution_count: null,
      outputs: [],
    })
  }

  cells.push({
    cell_type: 'markdown',
    metadata: {},
    source: [
      '## Summary\n',
      `- **Rows:** ${profile.summary.total_rows.toLocaleString()}\n`,
      `- **Columns:** ${profile.summary.total_columns}\n`,
      `- **Memory:** ${profile.summary.memory_usage_mb.toFixed(2)} MB\n`,
      `- **Transformations:** ${transforms.length}\n`,
    ],
  })

  return {
    nbformat: 4,
    nbformat_minor: 5,
    metadata: {
      kernelspec: { display_name: 'Python 3', language: 'python', name: 'python3' },
      language_info: { name: 'python', version: '3.9.0' },
    },
    cells,
  }
}
