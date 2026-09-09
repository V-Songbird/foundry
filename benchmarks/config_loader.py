import json
from dataclasses import dataclass, fields, is_dataclass
from pathlib import Path
from typing import Any, Dict, Optional, Type, TypeVar, Union, get_args, get_origin

T = TypeVar("T")


class ConfigError(Exception):
    """Raised when config validation fails."""
    pass


def load_config(path: Union[str, Path], schema: Type[T]) -> T:
    """Load and validate JSON config against a dataclass schema.

    Args:
        path: Path to JSON config file
        schema: Dataclass type to validate against

    Returns:
        Validated config instance

    Raises:
        ConfigError: If file not found, invalid JSON, or validation fails
    """
    path = Path(path)

    if not path.exists():
        raise ConfigError(f"Config file not found: {path}")

    try:
        with open(path) as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        raise ConfigError(f"Invalid JSON in {path}: {e}")

    if not isinstance(data, dict):
        raise ConfigError(f"Config root must be an object, got {type(data).__name__}")

    return _validate_and_construct(data, schema, path)


def _validate_and_construct(data: Dict[str, Any], schema: Type[T], path: Path) -> T:
    """Validate data against schema and construct instance."""
    if not is_dataclass(schema):
        raise ConfigError(f"Schema must be a dataclass, got {schema}")

    validated = {}
    required_fields = {f.name for f in fields(schema) if f.default is f.default_factory is None}
    provided_fields = set(data.keys())

    # Check required fields
    missing = required_fields - provided_fields
    if missing:
        raise ConfigError(f"Missing required fields in {path}: {', '.join(sorted(missing))}")

    # Check for unknown fields
    schema_fields = {f.name for f in fields(schema)}
    unknown = provided_fields - schema_fields
    if unknown:
        raise ConfigError(f"Unknown fields in {path}: {', '.join(sorted(unknown))}")

    # Validate and convert each field
    for field in fields(schema):
        if field.name not in data:
            continue

        value = data[field.name]
        validated[field.name] = _validate_value(value, field.type, field.name, path)

    try:
        return schema(**validated)
    except TypeError as e:
        raise ConfigError(f"Failed to construct {schema.__name__}: {e}")


def _validate_value(value: Any, expected_type: Type, field_name: str, path: Path) -> Any:
    """Validate and coerce a single value to expected type."""
    origin = get_origin(expected_type)
    args = get_args(expected_type)

    # Handle Optional[T]
    if origin is Union:
        if type(None) in args:
            if value is None:
                return None
            # Try the non-None type
            non_none_types = [t for t in args if t is not type(None)]
            if non_none_types:
                return _validate_value(value, non_none_types[0], field_name, path)
        raise ConfigError(f"Field '{field_name}' in {path}: unsupported Union type")

    # Handle list/List[T]
    if origin in (list, type(None)):
        if not isinstance(value, list):
            raise ConfigError(f"Field '{field_name}' in {path}: expected list, got {type(value).__name__}")
        if args:
            return [_validate_value(v, args[0], f"{field_name}[{i}]", path) for i, v in enumerate(value)]
        return value

    # Handle dict/Dict[K, V]
    if origin in (dict, type(None)):
        if not isinstance(value, dict):
            raise ConfigError(f"Field '{field_name}' in {path}: expected dict, got {type(value).__name__}")
        if args:
            return {k: _validate_value(v, args[1], f"{field_name}[{k}]", path) for k, v in value.items()}
        return value

    # Handle nested dataclass
    if is_dataclass(expected_type):
        if not isinstance(value, dict):
            raise ConfigError(f"Field '{field_name}' in {path}: expected object, got {type(value).__name__}")
        return _validate_and_construct(value, expected_type, path)

    # Handle primitive types
    if expected_type in (int, float, str, bool):
        if not isinstance(value, expected_type):
            raise ConfigError(f"Field '{field_name}' in {path}: expected {expected_type.__name__}, got {type(value).__name__}")
        return value

    raise ConfigError(f"Field '{field_name}' in {path}: unsupported type {expected_type}")
