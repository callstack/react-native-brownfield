def react_native_brownfield_post_integrate(installer)
  projects = installer.aggregate_targets.map(&:user_project).compact.uniq
  projects.each do |project|
    modified = false

    project.native_targets.each do |target|
      phases = target.build_phases
      expo_idx = phases.index { |p| p.respond_to?(:name) && p.name == '[Expo] Configure project' }
      patch_idx = phases.index { |p| p.respond_to?(:name) && p.name == 'Patch ExpoModulesProvider' }

      next if expo_idx.nil? || patch_idx.nil?
      next if patch_idx > expo_idx

      patch = phases.delete_at(patch_idx)
      expo_idx = phases.index { |p| p.respond_to?(:name) && p.name == '[Expo] Configure project' }
      phases.insert(expo_idx + 1, patch)
      modified = true
    end

    project.save if modified
  end
end
