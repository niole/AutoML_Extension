"""Shared helpers for compatibility route registration."""

import importlib


def lazy_import(module_path: str, *names: str):
    """Lazy import names from a module."""
    mod = importlib.import_module(module_path)
    if len(names) == 1:
        return getattr(mod, names[0])
    return tuple(getattr(mod, n) for n in names)
