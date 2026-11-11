# Source references — conceptual support only

- [NASA VIPER lunar operations](https://science.nasa.gov/mission/viper/lunar-operations/): rover route planning considers slopes, slipping and terrain hazards. The game's crater layout, path and resource values are fictional educational assumptions.

## Ten-day expedition: eclipse and radiation concepts

Reviewed 8 November 2026. These support conceptual distinctions; all numerical game values and the ten-day sequence remain educational assumptions.

- [NASA — Eclipses and the Moon](https://science.nasa.gov/moon/eclipses/): Earth's shadow interrupts sunlight at the Moon, with consequences for solar-powered spacecraft. From the lunar surface Earth can eclipse the Sun; the same alignment is a lunar eclipse to Earth observers.
- [NASA — Solar Flares FAQs](https://science.nasa.gov/blogs/solar-cycle-25/2022/06/10/solar-flares-faqs/): flares release electromagnetic radiation; flares and CMEs are distinct phenomena, with implications for astronauts and communications.
- [NASA SRAG — What is Space Radiation?](https://srag.jsc.nasa.gov/SpaceRadiation/What/What.cfm): energetic particles and cosmic rays contribute to exposure risk; solar activity and particle events are related without being interchangeable.
- [NASA — Parker Solar Probe and the Sun](https://www.nasa.gov/solar-system/nasas-parker-solar-probe-sheds-new-light-on-the-sun/): measurements distinguish energetic-particle storms and CMEs and explain why energetic particles matter to spacecraft and astronauts.

## Team identity asset

The TARUKH logo was supplied directly by the user on 8 November 2026 for this game's opening. The PNG is copied unchanged to `public/team/tarukh-logo.png`. CSS frames the existing mark and embedded name; no replacement logo was generated. Team identity and game title are separate fields in `content/branding.ts`.

## Main story additions

Reviewed 8 November 2026. Numerical resource models, mission procedures, site layout and chapter clocks remain educational assumptions, separately documented in `ASSUMPTIONS.md`.

- [NASA — Is There Weather on the Moon?](https://www.nasa.gov/general/is-there-weather-on-the-moon-we-asked-a-nasa-scientist-episode-34/): supports the absence of Earth-like wind and weather, used in the first investigation. Solar wind is a different phenomenon and is not a breeze that clears the array.
- [NASA — Environmental Control and Life Support Systems](https://www.nasa.gov/reference/environmental-control-and-life-support-systems-eclss/): conceptual support for water recovery and managed oxygen. This is ISS reference material, not validation of the fictional base's procedures or costs.
- [NASA — Lunar Communications Relay and Navigation Systems](https://www.nasa.gov/goddard/esc/lcrns/): supports relay communication where direct visibility to Earth is limited. The fictional outpost's specific ridge and relay pointing are invented.
- The solar-dust reference retained below supports the underlying equipment challenge. Rover blockage and sample-record tasks are elementary reasoning scenarios, not claims of certified NASA checklists.

The story is original. Detroit: Become Human was a user-provided interaction reference (branching story, investigation, visible choices). No assets, dialogue, characters or story scenes from that game are included.

Reviewed 8 November 2026. These references support the concepts; **they do not validate the game's resource numbers, action costs, capacities, mission duration, or success threshold**. See `ASSUMPTIONS.md` for those choices.

1. [NASA — Environmental Control and Life Support Systems (ECLSS)](https://www.nasa.gov/reference/environmental-control-and-life-support-systems-eclss/). Supports the ideas that space habitats need managed oxygen and water supplies and that water recovery is part of life support. The reference concerns the International Space Station, not a validated model of this fictional lunar base.
2. [NASA/TM-20240003496 — Lunar Dust Considerations for Vertical Solar Arrays, Volume 1](https://ntrs.nasa.gov/citations/20240003496), October 2024. Supports lunar dust as a challenge for exposed equipment and solar-array efficiency. It does not establish the game's fictional brush-cleaning method or +18-point benefit.

No NASA logos, external photos, or third-party 3D models are used. The lunar outpost is procedural geometry created for this prototype. No NASA affiliation or endorsement is implied.

## Downlink orbital source references (conceptual support)

3. [NASA — Lunar Reconnaissance Orbiter (LRO)](https://www.nasa.gov/mission/lunar-reconnaissance-orbiter/). Supports the concepts of polar lunar mapping, permanently shadowed crater exploration, and high-resolution crater imaging.
4. [NASA — Deep Space Network (DSN)](https://www.nasa.gov/directorates/somd/space-communications-navigation/deep-space-network/). Supports the ground station communication windows, planetary line-of-sight tracking, and high-frequency downlink transmissions.
5. [NASA — CAPSTONE Lunar CubeSat](https://www.nasa.gov/mission/capstone/). Supports the concept of compact, low-mass lunar relay satellites navigating near-rectilinear halo orbits.
6. [NASA — Laser Communications Relay Demonstration (LCRD / LLCD)](https://www.nasa.gov/directorates/stmd/laser-communications-relay-demonstration/). Supports the concept of optical laser transceivers providing high-bandwidth data transfers from lunar orbit.

## Mars sources

- NASA Mars solar time: https://www.giss.nasa.gov/tools/mars24/help/notes.html (mean sol approximately 24 h 39 min 35 s).
- NASA Mars gravity: https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/mars/ (approximately 3.7 m/s²).
- NASA astronaut model: https://science.nasa.gov/3d-resources/astronaut/; asset details and usage in `ASSET_CREDITS.md`.


Mars movement and airborne dust reference: [NASA Glenn Mars gravity](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/mars/) and [NASA Dusty Differences Between Mars and Earth](https://science.nasa.gov/earth/earth-observatory/dusty-differences-between-mars-and-earth-149926/). Existing Poly Haven CC0 scans remain the rock material source.


Jump motion follows [projectile mechanics](https://openstax.org/books/university-physics-volume-1/pages/4-3-projectile-motion): horizontal momentum persists without an external force and vertical altitude follows gravity. [Pavei and Minetti, 2016](https://pubmed.ncbi.nlm.nih.gov/26635350/) studied human hopping in simulated Martian and lunar gravity. This research informs the movement direction, while the game’s specific skeletal poses remain authored animation.

- NASA, Space Exploration Vehicle: https://science.nasa.gov/3d-resources/space-exploration-vehicle/ — identifies the crewed concept and describes approximately 10 km/h surface travel. Supports the forward speed target only, not the game's reverse, braking or simulated lidar parameters. Accessed 2026-11-11.
