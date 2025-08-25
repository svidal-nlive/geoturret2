#!/usr/bin/env node
// Print current registry versionMap JSON (kind:ids -> version)
import '../dist-baseline/content/initialContent.js';
import { Registries } from '../dist-baseline/content/registries.js';

const vm = Registries.versionMap();
console.log(JSON.stringify(vm, null, 2));
