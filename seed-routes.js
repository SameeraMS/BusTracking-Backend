const mongoose = require('mongoose');
const dotenv = require('dotenv');
const BusRoute = require('./models/BusRoute');

// Load env vars
dotenv.config();

// Sample routes with detailed coordinates
const sampleRoutes = [
  {
    routeId: 'route_138',
    routeNumber: '138',
    routeName: 'Colombo - Kandy',
    startPoint: {
      name: 'Colombo Fort',
      location: {
        type: 'Point',
        coordinates: [79.8612, 6.9271]
      }
    },
    endPoint: {
      name: 'Kandy Central',
      location: {
        type: 'Point',
        coordinates: [80.6350, 7.2906]
      }
    },
    path: {
      type: 'LineString',
      coordinates: [
        [79.8612, 6.9271], // Colombo Fort
        [79.8650, 6.9300], // Pettah
        [79.8700, 6.9350], // Maradana
        [79.8750, 6.9400], // Dematagoda
        [79.8800, 6.9450], // Orugodawatta
        [79.9200, 6.9800], // Kadawatha
        [79.9800, 7.0500], // Gampaha
        [80.2200, 7.1600], // Mawanella
        [80.4500, 7.2300], // Kegalle
        [80.6350, 7.2906]  // Kandy
      ]
    },
    stops: [
      {
        stopId: 'stop_138_1',
        name: 'Colombo Fort',
        location: { type: 'Point', coordinates: [79.8612, 6.9271] },
        order: 1,
        estimatedTime: 0
      },
      {
        stopId: 'stop_138_2',
        name: 'Pettah Central',
        location: { type: 'Point', coordinates: [79.8650, 6.9300] },
        order: 2,
        estimatedTime: 10
      },
      {
        stopId: 'stop_138_3',
        name: 'Maradana',
        location: { type: 'Point', coordinates: [79.8700, 6.9350] },
        order: 3,
        estimatedTime: 15
      },
      {
        stopId: 'stop_138_4',
        name: 'Kadawatha',
        location: { type: 'Point', coordinates: [79.9200, 6.9800] },
        order: 4,
        estimatedTime: 35
      },
      {
        stopId: 'stop_138_5',
        name: 'Gampaha',
        location: { type: 'Point', coordinates: [79.9800, 7.0500] },
        order: 5,
        estimatedTime: 60
      },
      {
        stopId: 'stop_138_6',
        name: 'Kandy Central',
        location: { type: 'Point', coordinates: [80.6350, 7.2906] },
        order: 6,
        estimatedTime: 180
      }
    ],
    distance: 115,
    estimatedDuration: 180,
    operatingHours: { start: '05:00', end: '22:00' },
    frequency: 30,
    fare: 250,
    color: '#3B82F6',
    isActive: true,
    description: 'Main route connecting Colombo to Kandy via Gampaha',
    direction: 'forward'
  },
  {
    routeId: 'route_177',
    routeNumber: '177',
    routeName: 'Colombo - Galle',
    startPoint: {
      name: 'Colombo Central',
      location: {
        type: 'Point',
        coordinates: [79.8428, 6.9344]
      }
    },
    endPoint: {
      name: 'Galle Fort',
      location: {
        type: 'Point',
        coordinates: [80.2170, 6.0367]
      }
    },
    path: {
      type: 'LineString',
      coordinates: [
        [79.8428, 6.9344], // Colombo Central
        [79.8400, 6.9300], // Bambalapitiya
        [79.8350, 6.9250], // Wellawatte
        [79.8300, 6.9200], // Dehiwala
        [79.8250, 6.9150], // Mount Lavinia
        [79.8900, 6.7900], // Panadura
        [79.9800, 6.5600], // Kalutara
        [80.0500, 6.3500], // Aluthgama
        [80.1200, 6.2000], // Hikkaduwa
        [80.2170, 6.0367]  // Galle
      ]
    },
    stops: [
      {
        stopId: 'stop_177_1',
        name: 'Colombo Central',
        location: { type: 'Point', coordinates: [79.8428, 6.9344] },
        order: 1,
        estimatedTime: 0
      },
      {
        stopId: 'stop_177_2',
        name: 'Bambalapitiya',
        location: { type: 'Point', coordinates: [79.8400, 6.9300] },
        order: 2,
        estimatedTime: 8
      },
      {
        stopId: 'stop_177_3',
        name: 'Mount Lavinia',
        location: { type: 'Point', coordinates: [79.8250, 6.9150] },
        order: 3,
        estimatedTime: 25
      },
      {
        stopId: 'stop_177_4',
        name: 'Panadura',
        location: { type: 'Point', coordinates: [79.8900, 6.7900] },
        order: 4,
        estimatedTime: 50
      },
      {
        stopId: 'stop_177_5',
        name: 'Kalutara',
        location: { type: 'Point', coordinates: [79.9800, 6.5600] },
        order: 5,
        estimatedTime: 80
      },
      {
        stopId: 'stop_177_6',
        name: 'Galle Fort',
        location: { type: 'Point', coordinates: [80.2170, 6.0367] },
        order: 6,
        estimatedTime: 150
      }
    ],
    distance: 119,
    estimatedDuration: 150,
    operatingHours: { start: '04:30', end: '23:00' },
    frequency: 20,
    fare: 280,
    color: '#10B981',
    isActive: true,
    description: 'Coastal route from Colombo to Galle along Galle Road',
    direction: 'forward'
  },
  {
    routeId: 'route_245',
    routeNumber: '245',
    routeName: 'Colombo - Negombo',
    startPoint: {
      name: 'Colombo Pettah',
      location: {
        type: 'Point',
        coordinates: [79.8730, 6.9147]
      }
    },
    endPoint: {
      name: 'Negombo Town',
      location: {
        type: 'Point',
        coordinates: [79.8358, 7.2083]
      }
    },
    path: {
      type: 'LineString',
      coordinates: [
        [79.8730, 6.9147], // Colombo Pettah
        [79.8760, 6.9180], // Kotahena
        [79.8800, 6.9220], // Grandpass
        [79.8840, 6.9260], // Peliyagoda
        [79.8880, 6.9300], // Kelaniya
        [79.9100, 6.9650], // Wattala
        [79.9200, 7.0100], // Ja-Ela
        [79.8900, 7.0800], // Katunayake
        [79.8500, 7.1500], // Seeduwa
        [79.8358, 7.2083]  // Negombo
      ]
    },
    stops: [
      {
        stopId: 'stop_245_1',
        name: 'Colombo Pettah',
        location: { type: 'Point', coordinates: [79.8730, 6.9147] },
        order: 1,
        estimatedTime: 0
      },
      {
        stopId: 'stop_245_2',
        name: 'Kelaniya',
        location: { type: 'Point', coordinates: [79.8880, 6.9300] },
        order: 2,
        estimatedTime: 20
      },
      {
        stopId: 'stop_245_3',
        name: 'Wattala',
        location: { type: 'Point', coordinates: [79.9100, 6.9650] },
        order: 3,
        estimatedTime: 35
      },
      {
        stopId: 'stop_245_4',
        name: 'Ja-Ela',
        location: { type: 'Point', coordinates: [79.9200, 7.0100] },
        order: 4,
        estimatedTime: 50
      },
      {
        stopId: 'stop_245_5',
        name: 'Katunayake Airport',
        location: { type: 'Point', coordinates: [79.8900, 7.0800] },
        order: 5,
        estimatedTime: 70
      },
      {
        stopId: 'stop_245_6',
        name: 'Negombo Town',
        location: { type: 'Point', coordinates: [79.8358, 7.2083] },
        order: 6,
        estimatedTime: 90
      }
    ],
    distance: 38,
    estimatedDuration: 90,
    operatingHours: { start: '05:00', end: '22:30' },
    frequency: 15,
    fare: 120,
    color: '#F59E0B',
    isActive: true,
    description: 'Route from Colombo to Negombo via Katunayake Airport',
    direction: 'forward'
  },
  {
    routeId: 'route_120',
    routeNumber: '120',
    routeName: 'Colombo - Matara',
    startPoint: {
      name: 'Colombo Fort',
      location: {
        type: 'Point',
        coordinates: [79.8612, 6.9271]
      }
    },
    endPoint: {
      name: 'Matara Bus Stand',
      location: {
        type: 'Point',
        coordinates: [80.5350, 5.9549]
      }
    },
    path: {
      type: 'LineString',
      coordinates: [
        [79.8612, 6.9271], // Colombo Fort
        [79.8300, 6.9000], // Wellawatta
        [79.8250, 6.8800], // Dehiwala
        [79.8200, 6.8400], // Panadura
        [79.9500, 6.5800], // Kalutara
        [80.0200, 6.4200], // Beruwala
        [80.0800, 6.3100], // Aluthgama
        [80.1500, 6.2300], // Hikkaduwa
        [80.2170, 6.0367], // Galle
        [80.3500, 6.0000], // Unawatuna
        [80.5350, 5.9549]  // Matara
      ]
    },
    stops: [
      {
        stopId: 'stop_120_1',
        name: 'Colombo Fort',
        location: { type: 'Point', coordinates: [79.8612, 6.9271] },
        order: 1,
        estimatedTime: 0
      },
      {
        stopId: 'stop_120_2',
        name: 'Panadura',
        location: { type: 'Point', coordinates: [79.8200, 6.8400] },
        order: 2,
        estimatedTime: 45
      },
      {
        stopId: 'stop_120_3',
        name: 'Kalutara',
        location: { type: 'Point', coordinates: [79.9500, 6.5800] },
        order: 3,
        estimatedTime: 70
      },
      {
        stopId: 'stop_120_4',
        name: 'Hikkaduwa',
        location: { type: 'Point', coordinates: [80.1500, 6.2300] },
        order: 4,
        estimatedTime: 120
      },
      {
        stopId: 'stop_120_5',
        name: 'Galle',
        location: { type: 'Point', coordinates: [80.2170, 6.0367] },
        order: 5,
        estimatedTime: 160
      },
      {
        stopId: 'stop_120_6',
        name: 'Matara Bus Stand',
        location: { type: 'Point', coordinates: [80.5350, 5.9549] },
        order: 6,
        estimatedTime: 200
      }
    ],
    distance: 160,
    estimatedDuration: 200,
    operatingHours: { start: '04:00', end: '23:00' },
    frequency: 25,
    fare: 350,
    color: '#EF4444',
    isActive: true,
    description: 'Southern expressway route from Colombo to Matara',
    direction: 'forward'
  },
  {
    routeId: 'route_350',
    routeNumber: '350',
    routeName: 'Kadawatha - Maharagama Circular',
    startPoint: {
      name: 'Kadawatha',
      location: {
        type: 'Point',
        coordinates: [79.9200, 6.9800]
      }
    },
    endPoint: {
      name: 'Kadawatha',
      location: {
        type: 'Point',
        coordinates: [79.9200, 6.9800]
      }
    },
    path: {
      type: 'LineString',
      coordinates: [
        [79.9200, 6.9800], // Kadawatha
        [79.9000, 6.9500], // Kiribathgoda
        [79.8800, 6.9200], // Peliyagoda
        [79.8600, 6.9000], // Dematagoda
        [79.8700, 6.8800], // Borella
        [79.8800, 6.8600], // Nugegoda
        [79.8900, 6.8400], // Maharagama
        [79.9200, 6.8500], // Homagama
        [79.9500, 6.8800], // Kaduwela
        [79.9400, 6.9200], // Athurugiriya
        [79.9200, 6.9800]  // Kadawatha
      ]
    },
    stops: [
      {
        stopId: 'stop_350_1',
        name: 'Kadawatha',
        location: { type: 'Point', coordinates: [79.9200, 6.9800] },
        order: 1,
        estimatedTime: 0
      },
      {
        stopId: 'stop_350_2',
        name: 'Peliyagoda',
        location: { type: 'Point', coordinates: [79.8800, 6.9200] },
        order: 2,
        estimatedTime: 20
      },
      {
        stopId: 'stop_350_3',
        name: 'Borella',
        location: { type: 'Point', coordinates: [79.8700, 6.8800] },
        order: 3,
        estimatedTime: 35
      },
      {
        stopId: 'stop_350_4',
        name: 'Nugegoda',
        location: { type: 'Point', coordinates: [79.8800, 6.8600] },
        order: 4,
        estimatedTime: 45
      },
      {
        stopId: 'stop_350_5',
        name: 'Maharagama',
        location: { type: 'Point', coordinates: [79.8900, 6.8400] },
        order: 5,
        estimatedTime: 55
      },
      {
        stopId: 'stop_350_6',
        name: 'Kadawatha',
        location: { type: 'Point', coordinates: [79.9200, 6.9800] },
        order: 6,
        estimatedTime: 120
      }
    ],
    distance: 45,
    estimatedDuration: 120,
    operatingHours: { start: '05:30', end: '21:00' },
    frequency: 40,
    fare: 80,
    color: '#8B5CF6',
    isActive: true,
    description: 'Circular route connecting suburbs of Colombo',
    direction: 'circular'
  }
];

async function seedRoutes() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/busTracking');
    console.log('MongoDB connected successfully');

    // Check if routes already exist
    const existingCount = await BusRoute.countDocuments();
    console.log(`Found ${existingCount} existing routes in database`);

    if (existingCount > 0) {
      console.log('\nDatabase already contains routes.');
      console.log('Do you want to:');
      console.log('1. Keep existing routes (abort)');
      console.log('2. Delete all and re-seed');
      console.log('\nTo delete and re-seed, run: npm run seed-routes -- --force');
      
      if (!process.argv.includes('--force')) {
        console.log('\nAborting seed operation. No changes made.');
        process.exit(0);
      }
      
      console.log('\nDeleting existing routes...');
      await BusRoute.deleteMany({});
      console.log('All routes deleted');
    }

    // Insert sample routes
    console.log(`\nInserting ${sampleRoutes.length} sample routes...`);
    const createdRoutes = await BusRoute.insertMany(sampleRoutes);
    
    console.log(`\n✅ Successfully created ${createdRoutes.length} routes:`);
    createdRoutes.forEach((route, index) => {
      console.log(`${index + 1}. Route ${route.routeNumber}: ${route.routeName}`);
      console.log(`   - Distance: ${route.distance}km`);
      console.log(`   - Duration: ${route.estimatedDuration} minutes`);
      console.log(`   - Stops: ${route.stops.length}`);
      console.log(`   - Path coordinates: ${route.path.coordinates.length} points`);
    });

    console.log('\n🎉 Route seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding routes:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
    process.exit(0);
  }
}

// Run the seed function
seedRoutes();
