"""Collection metadata stored as a standard NDEF text record."""
import json
import math
import ndef


def validate(data):
    if not isinstance(data, dict) or data.get('v') != 1:
        raise ValueError('Unsupported collection metadata version')
    if not isinstance(data.get('id'), str) or not data['id']:
        raise ValueError('Missing entry ID')
    geo = data.get('geo')
    if not isinstance(geo, list) or len(geo) != 2:
        raise ValueError('Coordinates must contain latitude and longitude')
    for value, limit in zip(geo, (90, 180)):
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or abs(value) > limit:
            raise ValueError('Invalid coordinates')
    ts = data.get('ts')
    if isinstance(ts, bool) or not isinstance(ts, (int, float)) or not math.isfinite(ts):
        raise ValueError('Invalid metadata timestamp')
    return data


def encode(data):
    validate(data)
    text = json.dumps(data, separators=(',', ':'), allow_nan=False)
    return b''.join(ndef.message_encoder([ndef.TextRecord(text)]))


def decode(octets):
    for record in ndef.message_decoder(octets):
        if isinstance(record, ndef.TextRecord) and record.text.startswith('{'):
            return validate(json.loads(record.text))
    return None
