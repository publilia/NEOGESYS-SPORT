#!/bin/bash

# Copia base demo per ogni ruolo
for role in coordinatore istruttore user super_admin; do
  cp index.html "${role}.html"
  
  # Update tenant-name con il ruolo
  sed -i "s|ASD Demo Sport</span>|ASD Demo Sport · <strong style=\"color: hsl(var(--primary));\">$role</strong></span>|" "${role}.html"
  sed -i "s|admin@demo-asd.sport</div>|admin@demo-asd.sport · <code style=\"background: hsl(var(--primary) / 0.1); color: hsl(var(--primary)); padding: 0.0625rem 0.25rem; border-radius: 0.25rem; font-size: 0.6875rem;\">$role</code></div>|" "${role}.html"
  
  echo "✓ Created ${role}.html"
done

echo "---"
ls -lh *.html | awk '{print $9, $5}'
